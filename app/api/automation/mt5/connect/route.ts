import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getMt5ConnectionForUser, getMt5DatabaseIssueMessage } from "@/lib/mt5-db";
import { MetaApiError, metaApiRequest, type MetaApiAccount } from "@/lib/metaapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CreatedAccount = MetaApiAccount & { state?: string };

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to connect MetaTrader 5." }, { status: 401 });
  }

  let body: { server?: unknown; login?: unknown; password?: unknown; transactionId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter your MT5 server, account login and investor password." }, { status: 400 });
  }

  const server = typeof body.server === "string" ? body.server.trim() : "";
  const login = typeof body.login === "string" ? body.login.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[A-Za-z0-9 ._-]{2,120}$/.test(server)) {
    return NextResponse.json({ error: "Enter the exact MT5 broker server name." }, { status: 400 });
  }
  if (!/^\d{1,32}$/.test(login)) {
    return NextResponse.json({ error: "Enter the numeric MT5 account login shown in your account details." }, { status: 400 });
  }
  if (!password || password.length > 128) {
    return NextResponse.json({ error: "Enter your MT5 investor password (the read-only password)." }, { status: 400 });
  }

  const transactionId =
    typeof body.transactionId === "string" && /^[0-9a-f]{32}$/i.test(body.transactionId)
      ? body.transactionId
      : randomBytes(16).toString("hex");

  try {
    const existing = await getMt5ConnectionForUser(userId);
    if (existing) {
      return NextResponse.json(
        { error: `An MT5 account is already linked to ${existing.server}. Disconnect it before connecting another account.` },
        { status: 409 },
      );
    }

    const created = await metaApiRequest<CreatedAccount>(
      "/users/current/accounts",
      {
        method: "POST",
        headers: { "transaction-id": transactionId },
        body: JSON.stringify({
          name: `Mivo MT5 ${userId.slice(-8)}`,
          login,
          password,
          server,
          platform: "mt5",
          magic: 0,
          type: "cloud-g2",
          tags: ["mivo-capital", "journal-sync"],
        }),
      },
      { accept202: true },
    );

    if (created.status === 202 || !created.data?.id && !created.data?._id) {
      const retryAfter = created.retryAfter;
      return NextResponse.json(
        {
          pending: true,
          transactionId,
          retryAfter,
          message: "Mivo is checking the MT5 connection. The same secure request will be retried shortly.",
        },
        { status: 202 },
      );
    }

    const providerAccountId = created.data.id || created.data._id;
    if (!providerAccountId) {
      throw new MetaApiError("MetaApi did not return an account reference.", 502);
    }

    const localId = randomUUID();
    const now = new Date();
    const status = created.data.state === "DRAFT" ? "AWAITING_CREDENTIALS" : "PENDING";
    try {
      await prisma.$executeRaw`
        INSERT INTO "BrokerConnection"
          ("id", "userId", "providerAccountId", "platform", "server", "status", "createdAt", "updatedAt")
        VALUES
          (${localId}, ${userId}, ${providerAccountId}, 'MT5', ${server}, ${status}, ${now}, ${now})
      `;
    } catch (error) {
      try {
        await metaApiRequest(
          `/users/current/accounts/${encodeURIComponent(providerAccountId)}`,
          { method: "DELETE" },
        );
      } catch {
        // Preserve the original database error; the orphaned account can be removed in MetaApi.
      }
      throw error;
    }

    return NextResponse.json({
      connection: { server, status },
    });
  } catch (error) {
    const databaseMessage = getMt5DatabaseIssueMessage(error);
    if (databaseMessage) {
      return NextResponse.json({ error: databaseMessage }, { status: 503 });
    }
    if (error instanceof MetaApiError) {
      const safeMessage = password ? error.message.split(password).join("[redacted]") : error.message;
      return NextResponse.json({ error: safeMessage }, { status: error.status });
    }
    console.error("MT5 CONNECT ERROR:", error);
    return NextResponse.json({ error: "Unable to prepare the MT5 connection." }, { status: 500 });
  }
}
