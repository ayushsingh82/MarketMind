import { buildContradictions, buildNewsImpacts } from "./mock";
import {
  getMacroEvents,
  getMarketSnapshot,
  getNews,
  getSectorSpotlight,
  hasSosoKey,
} from "./sosovalue";
import type { AskResponse } from "./types";

// MarketMind intelligence engine.
// Goal: turn raw SoSoValue inputs into a structured, evidence-backed
// reasoning object — never an order. The engine is read-only on purpose.

type IntentTag =
  | "down"
  | "up"
  | "narrative"
  | "macro"
  | "sector"
  | "asset"
  | "general";

function classifyIntent(query: string): IntentTag[] {
  const q = query.toLowerCase();
  const tags: IntentTag[] = [];
  if (/(down|fall|drop|crash|sell.?off|bearish)/.test(q)) tags.push("down");
  if (/(up|rally|pump|moon|bull|surge)/.test(q)) tags.push("up");
  if (/(ai|narrative|rotation|sector|trend)/.test(q)) tags.push("narrative");
  if (/(macro|cpi|fed|fomc|rate|inflation|jobs)/.test(q)) tags.push("macro");
  if (/(defi|l1|l2|memes?|stables?)/.test(q)) tags.push("sector");
  if (/(btc|bitcoin|eth|ethereum|sol|solana)/.test(q)) tags.push("asset");
  if (tags.length === 0) tags.push("general");
  return tags;
}

function extractSymbols(query: string): string[] {
  const q = query.toUpperCase();
  const universe = [
    "BTC", "ETH", "SOL", "ARB", "OP", "AVAX", "ADA", "MATIC", "LINK",
    "DOGE", "PEPE", "WIF", "BONK", "FET", "RNDR", "TAO", "AGIX", "ONDO",
    "MKR", "AAVE", "UNI", "LDO",
  ];
  return universe.filter((s) => q.includes(s));
}

function pickThesis(tags: IntentTag[], symbols: string[]): string {
  const focus = symbols[0] ?? "the market";
  if (tags.includes("down")) {
    return `Recent ${focus} weakness is macro-led: rate-path uncertainty plus thinning stablecoin supply has reduced the marginal-buyer pool, while news flow has shifted from accumulation to caution.`;
  }
  if (tags.includes("up")) {
    return `Recent ${focus} strength is flow-led, supported by ETF inflows, expanding sector breadth, and a softer macro backdrop. Continuation is plausible while funding stays neutral.`;
  }
  if (tags.includes("narrative")) {
    return `The dominant narrative is AI-infrastructure rotation. Velocity is high, breadth is widening, and price proxies confirm — but macro overhangs cap the persistence score.`;
  }
  if (tags.includes("macro")) {
    return `Macro is the swing factor. Pre-event positioning has tightened, derivatives are hedged into the print, and any surprise will determine whether the current bid persists or unwinds.`;
  }
  return `Cross-asset evidence currently leans risk-on with moderate macro overhang. Conviction comes from breadth, not single-name leadership.`;
}

function buildSuggestions(tags: IntentTag[]): string[] {
  const out: string[] = [];
  if (tags.includes("down")) {
    out.push("Wait for the next macro event window to clear before increasing exposure.");
    out.push("Prefer staggered entries; size off realized volatility, not headline tone.");
  } else if (tags.includes("up")) {
    out.push("Track funding rates — euphoria flips faster than spot signals.");
    out.push("Set drawdown stops based on your watchlist's blended beta, not single-name vol.");
  } else if (tags.includes("narrative")) {
    out.push("Use the narrative-velocity score to time entries into the breadth, not the leader.");
    out.push("Watch the contradiction list — narrative + flow disagreement is a tell.");
  } else {
    out.push("Sanity-check the thesis against the contradiction list before sizing.");
    out.push("Re-read in 4 hours — narratives decay; refresh the inputs, not the conclusion.");
  }
  return out;
}

export async function runMarketMindAnalysis(query: string): Promise<{ analysis: AskResponse; source: string }> {
  const tags = classifyIntent(query);
  const symbols = extractSymbols(query);

  let newsCount = 0;
  let marketPoints = 0;
  let macroEvents = 0;
  let sourceLabel = "internal/intelligence-engine";

  const liveContradictions = buildContradictions();
  const newsBank = buildNewsImpacts(8);

  if (hasSosoKey()) {
    try {
      const [news, market, macro] = await Promise.all([
        getNews(8),
        getMarketSnapshot(),
        getMacroEvents().catch(() => ({ data: [] as unknown[] })),
      ]);
      newsCount = news.data?.length ?? 0;
      marketPoints = market.data?.length ?? 0;
      macroEvents = macro.data?.length ?? 0;
      sourceLabel = "SoSoValue/news+market+macro";
    } catch (err) {
      sourceLabel = `SoSoValue (fallback: ${(err as Error).message.slice(0, 80)})`;
    }
  }

  if (newsCount === 0) newsCount = newsBank.length;
  if (marketPoints === 0) marketPoints = 12;
  if (macroEvents === 0) macroEvents = 3;

  const directional = tags.includes("down") ? -1 : tags.includes("up") ? 1 : 0;
  const conviction = Math.min(
    96,
    Math.max(
      32,
      60 +
        (directional !== 0 ? 14 : 0) +
        (symbols.length > 0 ? 8 : 0) +
        (tags.includes("macro") ? 6 : 0),
    ),
  );

  const evidenceSeed = newsBank
    .slice(0, 4)
    .filter((n) =>
      symbols.length === 0 ? true : n.symbols.some((s) => symbols.includes(s)),
    )
    .slice(0, 3);
  const evidence = evidenceSeed.length > 0 ? evidenceSeed : newsBank.slice(0, 3);

  const analysis: AskResponse = {
    thesis: pickThesis(tags, symbols),
    evidence: evidence.map((e) => ({
      label: e.classification.toUpperCase(),
      value: e.title,
      source: e.source,
    })),
    contradictions: liveContradictions.slice(0, 2).map((c) => `${c.title} — ${c.resolution}`),
    causes: [
      "News-flow sentiment shifted in the last cycle.",
      "Cross-sector breadth is " + (directional >= 0 ? "expanding" : "narrowing") + ".",
      "Macro calendar has " + (tags.includes("macro") ? "active event risk" : "moderate overhang") + ".",
    ],
    impact:
      directional > 0
        ? "Continuation is plausible if flows stay positive and macro remains stable; size off vol, not narrative."
        : directional < 0
          ? "Volatility can stay elevated until macro event risk clears; defensive tilt is warranted."
          : "Two-way risk dominates; intra-day reversals are likely until macro window closes.",
    confidence: conviction / 100,
    suggestions: buildSuggestions(tags),
    sources: { newsCount, marketPoints, macroEvents },
    citations: evidence.map((e) => ({ id: e.id, title: e.title, source: e.source })),
  };

  return { analysis, source: sourceLabel };
}

// Cross-source contradiction detector. The function is intentionally simple:
// it pairs current news sentiment with sector breadth and flags disagreement.
export async function detectContradictions() {
  if (hasSosoKey()) {
    try {
      const [news, sectors] = await Promise.all([getNews(8), getSectorSpotlight()]);
      const bullishNews = (news.data ?? []).filter((n) => n.sentiment === "bullish").length;
      const bearishNews = (news.data ?? []).filter((n) => n.sentiment === "bearish").length;
      const sectorBreadth = (sectors.data ?? []).reduce(
        (acc, s) => acc + (s.change24h > 0 ? 1 : -1),
        0,
      );
      const newsBias = bullishNews - bearishNews;
      const disagreement = Math.sign(newsBias) !== 0 && Math.sign(sectorBreadth) !== Math.sign(newsBias);
      const live = buildContradictions();
      if (disagreement) {
        live.unshift({
          id: `contra_live_${Date.now()}`,
          title: "Live: news bias and sector breadth disagree",
          signalA: { label: "News bias", value: `${newsBias >= 0 ? "+" : ""}${newsBias}`, source: "SoSoValue news" },
          signalB: { label: "Sector breadth", value: `${sectorBreadth >= 0 ? "+" : ""}${sectorBreadth}`, source: "SoSoValue sectors" },
          severity: "high",
          confidence: 82,
          resolution: "Treat the headline tone as tactical until breadth confirms or fades.",
          detectedAt: Date.now(),
        });
      }
      return { items: live, source: "SoSoValue+internal/contradiction-engine" };
    } catch (err) {
      return {
        items: buildContradictions(),
        source: `internal/contradiction-engine (fallback: ${(err as Error).message.slice(0, 60)})`,
      };
    }
  }
  return { items: buildContradictions(), source: "internal/contradiction-engine (offline preview)" };
}
