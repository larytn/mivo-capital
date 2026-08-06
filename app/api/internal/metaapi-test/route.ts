import { NextRequest, NextResponse } from "next/server";
import { metaApi } from "@/lib/metaapi";

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-mivo-api-key");

    if (
      !process.env.TRADING_SYNC_API_KEY ||
      apiKey !== process.env.TRADING_SYNC_API_KEY
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const accountId =
      request.nextUrl.searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json(
        { error: "MetaApi accountId is required." },
        { status: 400 }
      );
    }

    const account =
      await metaApi.metatraderAccountApi.getAccount(
        accountId
      );

    if (account.state !== "DEPLOYED") {
      await account.deploy();
    }

    await account.waitConnected();

    const connection =
      account.getRPCConnection();

    await connection.connect();
    await connection.waitSynchronized();

    const information =
      await connection.getAccountInformation();

    return NextResponse.json({
      success: true,

      account: {
        id: account.id,
        login: account.login,
        server: account.server,
        state: account.state,
        connectionStatus:
          account.connectionStatus,

        balance: information.balance,
        equity: information.equity,
        margin: information.margin,
        freeMargin: information.freeMargin,
      },
    });
  } catch (error: any) {
    console.error("METAAPI TEST ERROR:", error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to connect to MetaApi.",
      },
      { status: 500 }
    );
  }
}