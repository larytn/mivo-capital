import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { TRADING_RULES } from "@/lib/trading-rules";

export async function POST(request: NextRequest) {
  try {
    /*
     * AUTHENTICATION
     */

    const token =
      request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    /*
     * REQUEST DATA
     */

    const {
      account,
      price,
      type,
    } = await request.json();

    if (!account || !type) {
      return NextResponse.json(
        {
          error:
            "Account size and challenge type are required.",
        },
        { status: 400 }
      );
    }

    const numericPrice = Number(price);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      return NextResponse.json(
        { error: "Invalid challenge price." },
        { status: 400 }
      );
    }

    /*
     * PRODUCT CONFIGURATION
     *
     * This determines the architecture and
     * initial trading rules for each product.
     */

    let accountType:
  | "THREE_STEP"
  | "ONE_STEP"
  | "TWO_STEP"
  | "INSTANT";

let stage: "PHASE_1" | "FUNDED";

let profitTarget: number;
let dailyDrawdown: number;
let maxDrawdown: number;
let minimumTradeDays: number;

if (type === "Three-Step Challenge") {
  const rules = TRADING_RULES.THREE_STEP.PHASE_1;

  accountType = "THREE_STEP";
  stage = "PHASE_1";
  profitTarget = rules.profitTarget;
  dailyDrawdown = rules.dailyDrawdown;
  maxDrawdown = rules.maxDrawdown;
  minimumTradeDays = rules.minimumTradingDays;
} else if (type === "One-Step Challenge") {
  const rules = TRADING_RULES.ONE_STEP.PHASE_1;

  accountType = "ONE_STEP";
  stage = "PHASE_1";
  profitTarget = rules.profitTarget;
  dailyDrawdown = rules.dailyDrawdown;
  maxDrawdown = rules.maxDrawdown;
  minimumTradeDays = rules.minimumTradingDays;
} else if (type === "Two-Step Challenge") {
  const rules = TRADING_RULES.TWO_STEP.PHASE_1;

  accountType = "TWO_STEP";
  stage = "PHASE_1";
  profitTarget = rules.profitTarget;
  dailyDrawdown = rules.dailyDrawdown;
  maxDrawdown = rules.maxDrawdown;
  minimumTradeDays = rules.minimumTradingDays;
} else if (type === "Instant Funding") {
  const rules = TRADING_RULES.INSTANT.FUNDED;

  accountType = "INSTANT";
  stage = "FUNDED";
  profitTarget = 0;
  dailyDrawdown = rules.dailyDrawdown;
  maxDrawdown = rules.maxDrawdown;
  minimumTradeDays = rules.minimumTradingDays;
} else {
  return NextResponse.json(
    { error: "Invalid challenge type." },
    { status: 400 }
  );
}

    /*
     * CREATE CHALLENGE
     *
     * New accounts remain PENDING until
     * Admin assigns the trading account.
     */

    const challenge =
      await prisma.challenge.create({
        data: {
          account,
          price: numericPrice,
          type,

          accountType,
          stage,
          status: "PENDING",

          /*
           * CURRENT PRODUCT RULES
           */

          profitTarget,

          dailyDrawdown,
maxDrawdown,

          minimumTradeDays,

          userId:
            (payload as any).id,
        },
      });

    return NextResponse.json({
      success: true,

      message:
        "Challenge created successfully!",

      challenge: {
        id: challenge.id,

        account:
          challenge.account,

        type:
          challenge.type,

        accountType:
          challenge.accountType,

        stage:
          challenge.stage,

        status:
          challenge.status,

        price:
          challenge.price,

        profitTarget:
          challenge.profitTarget,

        dailyDrawdown:
          challenge.dailyDrawdown,

        maxDrawdown:
          challenge.maxDrawdown,

        minimumTradeDays:
          challenge.minimumTradeDays,
      },
    });
  } catch (error: any) {
    console.error(
      "Create challenge error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Internal Server Error",
      },
      { status: 500 }
    );
  }
}