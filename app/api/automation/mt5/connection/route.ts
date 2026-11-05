import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import {
  getMt5ConnectionForUser,
  getMt5DatabaseIssueMessage,
  setMt5ConnectionStatus,
} from "@/lib/mt5-db";
import { hasMetaApiToken, metaApiRequest, type MetaApiAccount } from "@/lib/metaapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to manage broker sync." }, { status: 401 });
  }

  try {
    const connection = await getMt5ConnectionForUser(userId);
    if (!connection) {
      return NextResponse.json({ connection: null, providerConfigured: hasMetaApiToken() });
    }

    let status = connection.status;
    let connectionStatus: string | null = null;
    let accountState: string | null = null;
    let loginHint: string | null = null;
    let providerError: string | null = null;

    if (hasMetaApiToken()) {
      try {
        const result = await metaApiRequest<MetaApiAccount>(
          `/users/current/accounts/${encodeURIComponent(connection.providerAccountId)}`,
        );
        const account = result.data;
        connectionStatus = account?.connectionStatus ?? null;
        accountState = account?.state ?? null;
        const login = account?.login ? String(account.login) : "";
        loginHint = login ? `\u2022\u2022\u2022\u2022${login.slice(-4)}` : null;
        status = connectionStatus === "CONNECTED" && accountState === "DEPLOYED"
          ? "CONNECTED"
          : accountState === "DRAFT"
            ? "AWAITING_CREDENTIALS"
            : "PENDING";
        await setMt5ConnectionStatus(connection.id, status);
      } catch (error) {
        providerError = error instanceof Error ? error.message : "Unable to read the MetaTrader connection status.";
      }
    }

    return NextResponse.json({
      providerConfigured: hasMetaApiToken(),
      connection: {
        id: connection.id,
        server: connection.server,
        status,
        connectionStatus,
        accountState,
        loginHint,
        lastSyncedAt: connection.lastSyncedAt,
      },
      ...(providerError ? { error: providerError } : {}),
    });
  } catch (error) {
    console.error("MT5 CONNECTION STATUS ERROR:", error);
    const databaseMessage = getMt5DatabaseIssueMessage(error);
    return NextResponse.json(
      { error: databaseMessage || "Unable to load the MT5 connection." },
      { status: databaseMessage ? 503 : 500 },
    );
  }
}

export async function DELETE() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to manage broker sync." }, { status: 401 });
  }

  try {
    const connection = await getMt5ConnectionForUser(userId);
    if (!connection) {
      return NextResponse.json({ error: "No MT5 account is connected." }, { status: 404 });
    }

    if (hasMetaApiToken()) {
      try {
        await metaApiRequest(
          `/users/current/accounts/${encodeURIComponent(connection.providerAccountId)}`,
          { method: "DELETE" },
        );
      } catch (error) {
        if (!(error instanceof Error && "status" in error && error.status === 404)) {
          throw error;
        }
      }
    }

    await prisma.$executeRaw`
      DELETE FROM "BrokerConnection"
      WHERE "id" = ${connection.id} AND "userId" = ${userId}
    `;
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to disconnect the MT5 account.";
    console.error("MT5 DISCONNECT ERROR:", message);
    const databaseMessage = getMt5DatabaseIssueMessage(error);
    return NextResponse.json({ error: databaseMessage || message }, { status: databaseMessage ? 503 : 502 });
  }
}
