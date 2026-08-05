import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const challenges = await prisma.challenge.findMany({
    select: {
      id: true,
      type: true,
      accountType: true,
      stage: true,
      status: true,

      account: true,
      mt5Login: true,

      startingBalance: true,
      currentBalance: true,
      currentEquity: true,

      profitTarget: true,
      profit: true,

      minimumTradeDays: true,
      tradingDays: true,

      breachReason: true,
    },

    orderBy: {
      createdAt: "asc",
    },
  });

  console.table(challenges);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });