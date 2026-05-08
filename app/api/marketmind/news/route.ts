import { NextResponse } from "next/server";
import { buildNewsImpacts } from "@/lib/mock";
import { getNews, hasSosoKey } from "@/lib/sosovalue";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(20, Math.max(2, Number(url.searchParams.get("limit") ?? 8)));

  if (hasSosoKey()) {
    try {
      const live = await getNews(limit);
      const enriched = (live.data ?? []).map((n, i) => {
        const fallback = buildNewsImpacts(limit)[i];
        return {
          id: n.id ?? fallback.id,
          title: n.title ?? fallback.title,
          source: n.source ?? fallback.source,
          publishedAt: n.publishedAt ?? fallback.publishedAt,
          sentiment: n.sentiment ?? fallback.sentiment,
          conviction: n.conviction ?? fallback.conviction,
          symbols: n.symbols ?? fallback.symbols,
          priceImpactPct: fallback.priceImpactPct,
          reactionWindowMin: fallback.reactionWindowMin,
          decayHalfLifeMin: fallback.decayHalfLifeMin,
          classification: fallback.classification,
          aiSummary: fallback.aiSummary,
        };
      });
      return NextResponse.json({
        ok: true,
        data: enriched,
        source: "SoSoValue/news + internal/impact-engine",
        generatedAt: Date.now(),
      });
    } catch (err) {
      return NextResponse.json({
        ok: true,
        data: buildNewsImpacts(limit),
        source: `SoSoValue/news (fallback: ${(err as Error).message.slice(0, 80)})`,
        generatedAt: Date.now(),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    data: buildNewsImpacts(limit),
    source: "SoSoValue/news (offline preview)",
    generatedAt: Date.now(),
  });
}
