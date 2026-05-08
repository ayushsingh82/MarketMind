import { NextResponse } from "next/server";
import { buildIntelligenceSummary } from "@/lib/mock";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  const data = buildIntelligenceSummary();
  return NextResponse.json({
    ok: true,
    data,
    source: "internal/intelligence-engine",
    generatedAt: Date.now(),
  });
}
