import { NextResponse } from "next/server";
import { buildSeries } from "@/lib/mock";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  const data = buildSeries(36);
  return NextResponse.json({
    ok: true,
    data,
    source: "SoSoValue/currency-snapshot + internal/normalizer",
    generatedAt: Date.now(),
  });
}
