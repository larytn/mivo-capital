import { NextRequest, NextResponse } from "next/server";
import { getMetaApi } from "@/lib/metaapi";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
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

    const metaApi = getMetaApi();

    const profiles =
      await metaApi.provisioningProfileApi
        .getProvisioningProfilesWithInfiniteScrollPagination();

    return NextResponse.json({
      success: true,
      count: profiles.length,
      profiles: profiles.map((profile: any) => ({
        id: profile.id,
        name: profile.name,
        version: profile.version,
        status: profile.status,
        type: profile.type,
      })),
    });
  } catch (error: any) {
    console.error("METAAPI PROFILES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to load profiles.",
      },
      { status: 500 }
    );
  }
}