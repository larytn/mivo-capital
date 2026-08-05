import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const challenge = await prisma.challenge.update({
    where: {
      id: "cms92ztw60004v0rw8t4x35tk",
    },
    data: {
      profit: 0,
      withdrawableProfit: 0,
    },
  });

  console.log("Fixed:", {
    id: challenge.id,
    profit: challenge.profit,
    withdrawableProfit: challenge.withdrawableProfit,
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });