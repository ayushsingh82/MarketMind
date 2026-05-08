import { NextResponse } from "next/server";
import { buildSentimentSeries } from "@/lib/mock";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  const data = buildSentimentSeries(24);
  return NextResponse.json({
    ok: true,
    data,
    source: "SoSoValue/news + internal/sentiment-aggregator",
    generatedAt: Date.now(),
  });
}
