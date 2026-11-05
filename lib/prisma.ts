import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function getPoolConfig() {
  const configuredUrl = process.env.DATABASE_URL;
  if (!configuredUrl) {
    throw new Error("DATABASE_URL is required to connect Mivo Capital to its database.");
  }

  const url = new URL(configuredUrl);
  const isSupabasePooler = url.hostname.endsWith(".pooler.supabase.com");
  const poolConfig = {
    connectionString: configuredUrl,
    max: process.env.NODE_ENV === "development" ? 10 : 1,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  };

  if (!isSupabasePooler) return poolConfig;

  url.searchParams.delete("sslmode");
  url.searchParams.delete("sslrootcert");
  url.searchParams.delete("sslcert");
  url.searchParams.delete("sslkey");
  url.searchParams.delete("connection_limit");
  url.searchParams.delete("pool_timeout");
  const ca = readFileSync(join(process.cwd(), "prisma", "certs", "supabase-prod-ca-2021.crt"), "utf8");

  return {
    ...poolConfig,
    connectionString: url.toString(),
    ssl: { ca, rejectUnauthorized: true },
  };
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg(getPoolConfig()),
    log: ["error", "warn"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
