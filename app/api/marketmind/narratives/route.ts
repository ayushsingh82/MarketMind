import { NextResponse } from "next/server";
import { buildNarratives } from "@/lib/mock";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  const data = buildNarratives();
  return NextResponse.json({
    ok: true,
    data,
    source: "internal/narrative-engine + SoSoValue/news",
    generatedAt: Date.now(),
  });
}
