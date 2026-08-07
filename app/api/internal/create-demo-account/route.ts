import { NextRequest, NextResponse } from "next/server";
import { getMetaApi } from "@/lib/metaapi";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    const {
      serverName,
      accountType,
      balance = 10000,
      leverage = 100,
      email = "trading@mivocapital.com",
      name = "Mivo Trader",
      phone = "+2348000000000",
      keywords,
    } = body;

    if (!serverName) {
      return NextResponse.json(
        { error: "MT5 server name is required." },
        { status: 400 }
      );
    }

    if (!accountType) {
      return NextResponse.json(
        { error: "MT5 account type is required." },
        { status: 400 }
      );
    }

    const startingBalance = Number(balance);
    const accountLeverage = Number(leverage);

    if (!Number.isFinite(startingBalance) || startingBalance <= 0) {
      return NextResponse.json(
        { error: "Invalid starting balance." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(accountLeverage) || accountLeverage <= 0) {
      return NextResponse.json(
        { error: "Invalid leverage." },
        { status: 400 }
      );
    }

    const metaApi = getMetaApi();

    const generatorApi =
      (metaApi as any).metatraderAccountGeneratorApi;

    if (!generatorApi) {
      return NextResponse.json(
        {
          error:
            "MetaTrader account generator API is unavailable.",
        },
        { status: 500 }
      );
    }

    const demoAccount =
      await generatorApi.createMT5DemoAccount({
        accountType: String(accountType),
        balance: startingBalance,
        email: String(email),
        leverage: accountLeverage,
        name: String(name),
        phone: String(phone),
        serverName: String(serverName),

        ...(Array.isArray(keywords) && keywords.length
          ? { keywords: keywords.map(String) }
          : {}),
      });

    return NextResponse.json({
      success: true,
      message: "MT5 demo account created successfully.",
      account: demoAccount,
    });
  } catch (error: any) {
    console.error("CREATE MT5 DEMO ACCOUNT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to create MT5 demo account.",
      },
      { status: 500 }
    );
  }
}