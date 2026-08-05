import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Admin@123", 10);

  await prisma.user.upsert({
    where: {
      email: "admin@mivocapital.com",
    },
    update: {
      role: "ADMIN",
    },
    create: {
      name: "Admin",
      email: "admin@mivocapital.com",
      password,
      role: "ADMIN",
    },
  });

  console.log("✅ Admin account created.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });