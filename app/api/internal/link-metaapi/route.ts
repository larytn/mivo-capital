import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const apiKey =
      request.headers.get("x-mivo-api-key");

    if (
      !process.env.TRADING_SYNC_API_KEY ||
      apiKey !== process.env.TRADING_SYNC_API_KEY
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { mt5Login, metaApiAccountId } =
      await request.json();

    if (!mt5Login || !metaApiAccountId) {
      return NextResponse.json(
        {
          error:
            "MT5 login and MetaApi account ID are required.",
        },
        { status: 400 }
      );
    }

    const challenge =
      await prisma.challenge.findFirst({
        where: {
          mt5Login: String(mt5Login),
        },
      });

    if (!challenge) {
      return NextResponse.json(
        {
          error:
            "No Mivo trading account found with this MT5 login.",
        },
        { status: 404 }
      );
    }

    const updated =
      await prisma.challenge.update({
        where: {
          id: challenge.id,
        },

        data: {
          metaApiAccountId:
            String(metaApiAccountId),
        },

        select: {
          id: true,
          mt5Login: true,
          metaApiAccountId: true,
          accountType: true,
          stage: true,
          status: true,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "MetaApi account linked successfully.",
      account: updated,
    });
  } catch (error: any) {
    console.error(
      "LINK METAAPI ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to link MetaApi account.",
      },
      { status: 500 }
    );
  }
}