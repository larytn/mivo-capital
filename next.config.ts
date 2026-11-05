import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: { "/*": ["./prisma/certs/supabase-prod-ca-2021.crt"] },
};

export default nextConfig;
