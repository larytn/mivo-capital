import { NextResponse } from "next/server";
import { getMt5ConnectionsForCron, syncMt5Connection } from "@/lib/mt5-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const connections = await getMt5ConnectionsForCron();
    const results: Array<{ status: string; imported: number; open: number } | { error: string }> = [];
    for (let start = 0; start < connections.length; start += 4) {
      const batch = connections.slice(start, start + 4);
      const batchResults = await Promise.all(
        batch.map(async (connection) => {
          try {
            return await syncMt5Connection(connection);
          } catch (error) {
            const message = error instanceof Error ? error.message : "MT5 sync failed.";
            console.error(`MT5 CRON SYNC ERROR (${connection.id}):`, message);
            return { error: message };
          }
        }),
      );
      results.push(...batchResults);
    }

    return NextResponse.json({
      processed: results.length,
      imported: results.reduce((sum, result) => sum + ("imported" in result ? result.imported : 0), 0),
      open: results.reduce((sum, result) => sum + ("open" in result ? result.open : 0), 0),
      failed: results.filter((result) => "error" in result).length,
    });
  } catch (error) {
    console.error("MT5 CRON JOB ERROR:", error);
    return NextResponse.json({ error: "MT5 sync job failed." }, { status: 500 });
  }
}
