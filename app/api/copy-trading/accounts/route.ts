import { randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { MetaApiError, metaApiClientRequest, metaApiRequest, type MetaApiAccount, type MetaTraderAccountInformation } from "@/lib/metaapi";
import { LIVE_COPY_ENABLED } from "@/lib/copy-trading-live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maskedLogin(value: string) { return `••••${value.slice(-4)}`; }

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to manage live copy accounts." }, { status: 401 });
  try {
    const accounts = await prisma.copyTradingAccount.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    const refreshed = await Promise.all(accounts.map(async (account) => {
      try {
        const { data: remote } = await metaApiRequest<MetaApiAccount>(`/users/current/accounts/${encodeURIComponent(account.metaApiAccountId)}`);
        if (!remote?.region) return account;
        const connectionStatus = remote.connectionStatus === "CONNECTED" && remote.state === "DEPLOYED" ? "CONNECTED" : "PENDING";
        if (connectionStatus !== "CONNECTED") {
          await prisma.copyTradingAccount.update({ where: { id: account.id }, data: { connectionStatus } });
          return { ...account, connectionStatus };
        }
        const information = await metaApiClientRequest<MetaTraderAccountInformation>(remote.region, `/users/current/accounts/${encodeURIComponent(account.metaApiAccountId)}/account-information?refreshTerminalState=true`);
        const eligible = information.type === "ACCOUNT_TRADE_MODE_REAL"
          && information.marginMode === "ACCOUNT_MARGIN_MODE_RETAIL_HEDGING"
          && information.tradeAllowed === true && information.investorMode !== true;
        const status = eligible ? "CONNECTED" : "INELIGIBLE";
        await prisma.copyTradingAccount.update({ where: { id: account.id, userId }, data: {
          region: remote.region,
          server: information.server || account.server,
          accountCurrency: information.currency || account.accountCurrency,
          balance: Number.isFinite(information.balance) ? information.balance : account.balance,
          equity: Number.isFinite(information.equity) ? information.equity : account.equity,
          tradeMode: information.type || "UNKNOWN",
          marginMode: information.marginMode || "UNKNOWN",
          connectionStatus: status,
        } });
        return { ...account, region: remote.region, server: information.server || account.server, accountCurrency: information.currency || account.accountCurrency, balance: information.balance ?? account.balance, equity: information.equity ?? account.equity, tradeMode: information.type || "UNKNOWN", marginMode: information.marginMode || "UNKNOWN", connectionStatus: status };
      } catch {
        return account;
      }
    }));
    return NextResponse.json({ accounts: refreshed.map((account) => ({
      id: account.id, server: account.server, loginHint: account.loginHint,
      accountCurrency: account.accountCurrency, balance: account.balance, equity: account.equity,
      tradeMode: account.tradeMode, marginMode: account.marginMode,
      connectionStatus: account.connectionStatus, copyFactoryEnabled: account.copyFactoryEnabled,
      consentAt: account.consentAt, createdAt: account.createdAt, updatedAt: account.updatedAt,
    })), liveCopyEnabled: LIVE_COPY_ENABLED });
  } catch (error) {
    console.error("LIVE COPY ACCOUNTS GET ERROR:", error);
    return NextResponse.json({ error: "Unable to load connected copy accounts." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to link a live trading account." }, { status: 401 });
  if (!LIVE_COPY_ENABLED) return NextResponse.json({ error: "Live copy activation is disabled until Mivo enables its paid MetaApi CopyFactory service." }, { status: 503 });
  let accountId: string | null = null;
  let password = "";
  try {
    const body = await request.json() as { server?: unknown; login?: unknown; password?: unknown; consent?: unknown; transactionId?: unknown };
    const server = typeof body.server === "string" ? body.server.trim() : "";
    const login = typeof body.login === "string" ? body.login.trim() : "";
    password = typeof body.password === "string" ? body.password : "";
    if (body.consent !== true) return NextResponse.json({ error: "Confirm that this real account may receive live copied orders before linking it." }, { status: 400 });
    if (!/^[A-Za-z0-9 ._-]{2,120}$/.test(server) || !/^\d{1,32}$/.test(login) || !password || password.length > 128) {
      return NextResponse.json({ error: "Enter a valid MT5 server, account login and trading password." }, { status: 400 });
    }
    const count = await prisma.copyTradingAccount.count({ where: { userId } });
    if (count >= 5) return NextResponse.json({ error: "You can link up to five live copy accounts." }, { status: 409 });

    const transactionId = typeof body.transactionId === "string" && /^[0-9a-f]{32}$/i.test(body.transactionId) ? body.transactionId : randomBytes(16).toString("hex");
    const created = await metaApiRequest<MetaApiAccount>("/users/current/accounts", {
      method: "POST",
      headers: { "transaction-id": transactionId },
      body: JSON.stringify({
        name: `Mivo live copy ${userId.slice(-8)}`,
        login, password, server, platform: "mt5", magic: 0, type: "cloud-g2",
        tags: ["mivo-capital", "live-copy-subscriber"],
      }),
    }, { accept202: true });
    const remoteId = created.data?.id || created.data?._id;
    if (created.status === 202 || !remoteId) {
      return NextResponse.json({ pending: true, transactionId, retryAfter: created.retryAfter, message: "MetaApi is securely checking this account. Retry the same request shortly." }, { status: 202 });
    }
    accountId = remoteId;
    let remote = created.data;
    if (!remote?.region) remote = (await metaApiRequest<MetaApiAccount>(`/users/current/accounts/${encodeURIComponent(remoteId)}`)).data;
    if (!remote?.region) throw new MetaApiError("MetaApi has not returned an account deployment region yet.", 409);

    const pending = await prisma.copyTradingAccount.create({ data: {
      id: randomUUID(), userId, metaApiAccountId: remoteId, region: remote.region,
      server, loginHint: maskedLogin(login), accountCurrency: "UNKNOWN",
      tradeMode: "UNKNOWN", marginMode: "UNKNOWN",
      connectionStatus: remote.connectionStatus === "CONNECTED" && remote.state === "DEPLOYED" ? "PENDING_CHECK" : "PENDING",
      consentAt: new Date(),
    } });
    return NextResponse.json({ account: { id: pending.id, server: pending.server, loginHint: pending.loginHint, connectionStatus: pending.connectionStatus }, message: "Account linked with MetaApi. Mivo will verify that it is a live, trade-enabled MT5 hedging account." }, { status: 201 });
  } catch (error) {
    if (accountId) {
      try { await metaApiRequest(`/users/current/accounts/${encodeURIComponent(accountId)}`, { method: "DELETE" }); } catch { /* preserve the account-setup error */ }
    }
    if (error instanceof MetaApiError) {
      const safeMessage = password ? error.message.split(password).join("[redacted]") : error.message;
      return NextResponse.json({ error: safeMessage }, { status: error.status });
    }
    console.error("LIVE COPY ACCOUNT LINK ERROR:", error);
    return NextResponse.json({ error: "Unable to link this trading account." }, { status: 500 });
  }
}
