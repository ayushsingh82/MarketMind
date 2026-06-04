import { NextResponse } from "next/server";
import { buildNewsImpacts } from "@/lib/mock";
import { buildLiveNewsImpacts } from "@/lib/marketmind";
import { hasSosoKey } from "@/lib/sosovalue";

export const runtime = "nodejs";
export const revalidate = 0;

// News impact feed.
// When a SoSoValue key is present, this returns REAL headlines with:
//   - sentiment + conviction DERIVED from headline text + engagement
//     (the /news feed has no native sentiment field), and
//   - priceImpactPct / reactionWindowMin / decayHalfLifeMin MEASURED by joining
//     each release_time with /currencies/{id}/klines (see buildLiveNewsImpacts).
// No key → deterministic mock.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(20, Math.max(2, Number(url.searchParams.get("limit") ?? 8)));

  if (hasSosoKey()) {
    const { items, source } = await buildLiveNewsImpacts(limit);
    return NextResponse.json({ ok: true, data: items, source, generatedAt: Date.now() });
  }

  return NextResponse.json({
    ok: true,
    data: buildNewsImpacts(limit),
    source: "SoSoValue/news (offline preview)",
    generatedAt: Date.now(),
  });
}
