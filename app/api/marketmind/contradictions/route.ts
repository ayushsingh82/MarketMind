import { NextResponse } from "next/server";
import { detectContradictions } from "@/lib/marketmind";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  const { items, source } = await detectContradictions();
  return NextResponse.json({
    ok: true,
    data: items,
    source,
    generatedAt: Date.now(),
  });
}
