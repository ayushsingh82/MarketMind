import { NextResponse } from "next/server";
import { runMarketMindBrief } from "@/lib/marketmind";

export const runtime = "nodejs";
export const revalidate = 0;

// Polled by the dashboard; cache the generated brief so we don't hit the model
// server on every poll.
const BRIEF_TTL_MS = 90_000;
let cache: { at: number; brief: string; live: boolean; source: string } | null = null;

export async function GET() {
  const now = Date.now();
  if (!cache || now - cache.at > BRIEF_TTL_MS) {
    try {
      const { brief, live, source } = await runMarketMindBrief();
      cache = { at: now, brief, live, source };
    } catch (err) {
      cache = {
        at: now,
        brief: "Market brief temporarily unavailable.",
        live: false,
        source: `error: ${(err as Error).message.slice(0, 80)}`,
      };
    }
  }

  return NextResponse.json({
    ok: true,
    data: { brief: cache.brief, live: cache.live },
    source: cache.source,
    generatedAt: cache.at,
  });
}
