
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/api-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const { id } = await params;
    const trade = await prisma.journalTrade.findFirst({ where: { id, userId } });
    if (!trade) return NextResponse.json({ error: "Trade not found." }, { status: 404 });

    await prisma.journalTrade.delete({ where: { id } });

    return NextResponse.json({ message: "Trade deleted." });
  } catch (error) {
    console.error("JOURNAL DELETE ERROR:", error);
    return NextResponse.json(
      { error: "Unable to delete trade." },
      { status: 500 }
    );
  }
}
