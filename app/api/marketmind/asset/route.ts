import { NextResponse } from "next/server";
import { buildAssetDeepDive } from "@/lib/mock";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = (url.searchParams.get("symbol") ?? "ETH").toUpperCase();
  const data = buildAssetDeepDive(symbol);
  return NextResponse.json({
    ok: true,
    data,
    source: "SoSoValue/currency-snapshot + internal/driver-engine",
    generatedAt: Date.now(),
  });
}
