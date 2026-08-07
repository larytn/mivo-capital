import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const {
      mt5Login,
      mt5Password,
      investorPassword,
      server,
      broker,
      platform = "MT5",
      accountSize,
      accountType,
      metaApiAccountId,
    } = await request.json();

    if (
      !mt5Login ||
      !mt5Password ||
      !server ||
      !broker ||
      !accountSize ||
      !accountType
    ) {
      return NextResponse.json(
        { error: "Required account information is missing." },
        { status: 400 }
      );
    }

    const size = Number(accountSize);

    if (!Number.isFinite(size) || size <= 0) {
      return NextResponse.json(
        { error: "Invalid account size." },
        { status: 400 }
      );
    }

    const validTypes = [
      "THREE_STEP",
      "ONE_STEP",
      "TWO_STEP",
      "INSTANT",
    ];

    if (!validTypes.includes(accountType)) {
      return NextResponse.json(
        { error: "Invalid account type." },
        { status: 400 }
      );
    }

    const existing =
      await prisma.tradingAccountPool.findUnique({
        where: {
          mt5Login: String(mt5Login),
        },
      });

    if (existing) {
      return NextResponse.json(
        {
          error: "MT5 account already exists in pool.",
          account: {
            id: existing.id,
            mt5Login: existing.mt5Login,
            status: existing.status,
          },
        },
        { status: 409 }
      );
    }

    const account =
      await prisma.tradingAccountPool.create({
        data: {
          mt5Login: String(mt5Login),
          mt5Password: String(mt5Password),

          investorPassword: investorPassword
            ? String(investorPassword)
            : null,

          server: String(server),
          broker: String(broker),
          platform: String(platform),

          accountSize: size,
          accountType: String(accountType),

          metaApiAccountId: metaApiAccountId
            ? String(metaApiAccountId)
            : null,

          status: "AVAILABLE",
        },
      });

    return NextResponse.json({
      success: true,
      message: "MT5 account added to Mivo account pool.",

      account: {
        id: account.id,
        mt5Login: account.mt5Login,
        server: account.server,
        broker: account.broker,
        accountSize: account.accountSize,
        accountType: account.accountType,
        status: account.status,
        metaApiAccountId: account.metaApiAccountId,
      },
    });
  } catch (error: any) {
    console.error("ACCOUNT POOL ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to add account to pool.",
      },
      { status: 500 }
    );
  }
}