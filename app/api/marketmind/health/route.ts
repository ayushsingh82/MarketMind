import { NextResponse } from "next/server";
import { hasSosoKey } from "@/lib/sosovalue";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      sosovalue: hasSosoKey() ? "configured" : "offline-preview",
      uptime: process.uptime(),
      env: process.env.NODE_ENV ?? "development",
      time: new Date().toISOString(),
    },
    source: "internal/health",
    generatedAt: Date.now(),
  });
}
