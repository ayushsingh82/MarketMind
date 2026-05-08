import { NextResponse } from "next/server";
import { buildWatchlist } from "@/lib/mock";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: buildWatchlist(),
    source: "internal/watchlist + SoSoValue/market-snapshot",
    generatedAt: Date.now(),
  });
}
