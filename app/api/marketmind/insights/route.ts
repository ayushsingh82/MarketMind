import { NextResponse } from "next/server";
import { buildAlerts, buildPersonalInsights } from "@/lib/mock";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      insights: buildPersonalInsights(),
      alerts: buildAlerts(),
    },
    source: "internal/personalization-engine",
    generatedAt: Date.now(),
  });
}
