import { getMacroEvents, getMarketSnapshot, getNews } from "./sosovalue";

export type MarketMindResponse = {
  summary: string;
  causes: string[];
  impact: string;
  confidence: number;
  suggestions: string[];
  sources: {
    newsCount: number;
    marketPoints: number;
    macroEvents: number;
  };
};

function buildMockAnalystAnswer(query: string, sourceSizes: { news: number; market: number; macro: number }) {
  const q = query.toLowerCase();
  const isDown = q.includes("down") || q.includes("fall");

  return {
    summary: isDown
      ? "Market weakness appears macro-led, with risk-off pressure in majors."
      : "Recent move appears flow-led, supported by sentiment and sector rotation.",
    causes: [
      "News sentiment shifted in the last cycle.",
      "Price/volume context confirms short-term momentum change.",
      "Macro calendar increased directional uncertainty.",
    ],
    impact: isDown
      ? "Short-term volatility can remain elevated until macro event risk clears."
      : "Momentum can continue if flows stay positive and macro remains stable.",
    confidence: 0.82,
    suggestions: [
      "Track macro event window before increasing exposure.",
      "Prefer staggered entries rather than one large order.",
    ],
    sources: {
      newsCount: sourceSizes.news,
      marketPoints: sourceSizes.market,
      macroEvents: sourceSizes.macro,
    },
  } satisfies MarketMindResponse;
}

export async function runMarketMindAnalysis(query: string) {
  const [news, market, macro] = await Promise.all([getNews(), getMarketSnapshot(), getMacroEvents()]);
  return buildMockAnalystAnswer(query, {
    news: news.data?.length ?? 0,
    market: market.data?.length ?? 0,
    macro: macro.data?.length ?? 0,
  });
}
