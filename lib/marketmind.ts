import { buildContradictions, buildNewsImpacts } from "./mock";
import {
  getEtfFlows,
  getKlines,
  getMacroEvents,
  getMarketSnapshot,
  getNews,
  getSectorSpotlight,
  hasSosoKey,
  type NewsItem,
} from "./sosovalue";
import { getMarkPrices, getRecentTrades, hasSodexKey } from "./sodex";
import {
  classifyNews,
  computePriceImpact,
  deriveConviction,
  deriveSentiment,
  takerBuyStats,
  toSodexPair,
} from "./analytics";
import { generateBrief, hasLlmKey, runMarketMindLLM, type LlmContext } from "./llm";
import type { AskResponse, Contradiction, NewsImpact } from "./types";

// MarketMind intelligence engine.
// Goal: turn raw SoSoValue + SoDEX inputs into a structured, evidence-backed
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

// ---------------------------------------------------------------------------
// Ask Market — REAL LLM when ANTHROPIC_API_KEY is set, heuristic fallback otherwise.
// ---------------------------------------------------------------------------

export async function runMarketMindAnalysis(query: string): Promise<{ analysis: AskResponse; source: string }> {
  const tags = classifyIntent(query);
  const symbols = extractSymbols(query);

  // Gather grounding context. Live where keys exist, mock otherwise. We always
  // build a usable context object so the LLM (or the fallback) has something real.
  const ctx = await gatherContext(query, symbols);

  // 1) Real LLM path.
  if (hasLlmKey()) {
    try {
      const { analysis, source } = await runMarketMindLLM(ctx);
      return { analysis, source };
    } catch (err) {
      // Fall through to the heuristic with an honest source label.
      const fallback = heuristicAnalysis(query, tags, symbols, ctx);
      return {
        analysis: fallback.analysis,
        source: `heuristic (LLM error: ${(err as Error).message.slice(0, 70)})`,
      };
    }
  }

  // 2) Heuristic fallback (no LLM key).
  return heuristicAnalysis(query, tags, symbols, ctx);
}

// Wave 3 AI Market Brief — a live tape note grounded in the same context.
// Falls back to a deterministic one-liner if the model is unreachable.
export async function runMarketMindBrief(): Promise<{ brief: string; live: boolean; source: string }> {
  const ctx = await gatherContext("market overview right now", []);
  const { text, live, source } = await generateBrief(ctx);
  if (live && text) return { brief: text, live: true, source };

  // Deterministic fallback from the grounding data.
  const up = ctx.sectors.filter((s) => s.change24h > 0).length;
  const down = ctx.sectors.length - up;
  const topNews = ctx.news[0]?.title ?? "no fresh headlines";
  const breadth = ctx.sectors.length
    ? `${up} up / ${down} down across sectors`
    : "sector breadth unavailable";
  return {
    brief: `Tape read: ${breadth}. Lead headline — ${topNews}. Watch for cross-source disagreement between news tone and breadth before leaning either way.`,
    live: false,
    source: hasSosoKey() ? "heuristic tape brief (live data)" : "heuristic tape brief (offline preview)",
  };
}

async function gatherContext(query: string, symbols: string[]): Promise<LlmContext> {
  // Defaults from mock so the context is never empty.
  const mockNews = buildNewsImpacts(8);
  let news: LlmContext["news"] = mockNews.map((n) => ({
    id: n.id, title: n.title, source: n.source, sentiment: n.sentiment,
    conviction: n.conviction, symbols: n.symbols, publishedAt: n.publishedAt,
  }));
  let sectors: LlmContext["sectors"] = [];
  let macro: LlmContext["macro"] = [];
  let market: LlmContext["market"] = [];
  let etfFlows: LlmContext["etfFlows"] = undefined;

  if (hasSosoKey()) {
    try {
      const [newsRes, marketRes, sectorRes, macroRes] = await Promise.all([
        getNews(8),
        getMarketSnapshot().catch(() => ({ data: [] })),
        getSectorSpotlight().catch(() => ({ data: [] })),
        getMacroEvents().catch(() => ({ data: [] })),
      ]);
      if (newsRes.data?.length) {
        news = newsRes.data.map((n) => ({
          id: n.id,
          title: n.title,
          source: n.source,
          sentiment: n.sentiment ?? deriveSentiment(n.title),
          conviction: n.conviction ?? deriveConviction(n),
          symbols: n.symbols,
          publishedAt: n.publishedAt,
        }));
      }
      if (marketRes.data?.length) {
        market = marketRes.data.slice(0, 20).map((m) => ({ symbol: m.symbol, price: m.price, change24h: m.change24h }));
      }
      if (sectorRes.data?.length) {
        sectors = sectorRes.data.map((s) => ({ sector: s.sector, change24h: s.change24h, marketCap: s.marketCap }));
      }
      if (macroRes.data?.length) {
        macro = macroRes.data.map((e) => ({ title: e.title, scheduledAt: e.scheduledAt, importance: e.importance }));
      }
      // ETF flows for the focal asset (default BTC).
      const etfSym = symbols.includes("ETH") ? "us-eth-spot" : "us-btc-spot";
      const etf = await getEtfFlows(etfSym, 7).catch(() => ({ data: [] }));
      if (etf.data?.length) {
        etfFlows = etf.data.map((f) => ({ symbol: f.symbol, date: f.date, totalNetInflow: f.totalNetInflow }));
      }
    } catch {
      // keep mock defaults
    }
  }

  return { query, news, sectors, macro, market, etfFlows };
}

function heuristicAnalysis(
  query: string,
  tags: IntentTag[],
  symbols: string[],
  ctx: LlmContext,
): { analysis: AskResponse; source: string } {
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

  const evidenceSeed = ctx.news
    .filter((n) => (symbols.length === 0 ? true : (n.symbols ?? []).some((s) => symbols.includes(s))))
    .slice(0, 3);
  const evidence = evidenceSeed.length > 0 ? evidenceSeed : ctx.news.slice(0, 3);

  const liveContradictions = buildContradictions();

  const analysis: AskResponse = {
    thesis: pickThesis(tags, symbols),
    evidence: evidence.map((e) => ({
      label: (e.sentiment ?? "news").toUpperCase(),
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
    sources: { newsCount: ctx.news.length, marketPoints: ctx.market.length || 12, macroEvents: ctx.macro.length || 3 },
    citations: evidence.map((e) => ({ id: e.id, title: e.title, source: e.source })),
  };

  const source = hasSosoKey()
    ? "heuristic/intelligence-engine + SoSoValue grounding"
    : "heuristic/intelligence-engine (offline preview)";
  return { analysis, source };
}

// ---------------------------------------------------------------------------
// Real news-impact pipeline: join news with klines and measure actual returns.
// ---------------------------------------------------------------------------

const SYMBOL_TO_CURRENCY_ID: Record<string, string> = {
  BTC: "BTC", ETH: "ETH", SOL: "SOL", AVAX: "AVAX", ARB: "ARB",
  FET: "FET", RNDR: "RNDR", TAO: "TAO",
};

export async function buildLiveNewsImpacts(limit = 8): Promise<{ items: NewsImpact[]; source: string }> {
  if (!hasSosoKey()) {
    return { items: buildNewsImpacts(limit), source: "internal/impact-engine (offline preview)" };
  }
  try {
    const newsRes = await getNews(limit);
    const news = newsRes.data ?? [];
    if (!news.length) {
      return { items: buildNewsImpacts(limit), source: "SoSoValue/news empty → mock impacts" };
    }

    // Fetch klines once per distinct focal symbol referenced by the headlines.
    const focal = new Set<string>();
    for (const n of news) {
      const sym = (n.symbols ?? [])[0];
      if (sym && SYMBOL_TO_CURRENCY_ID[sym]) focal.add(sym);
    }
    if (focal.size === 0) focal.add("BTC");

    const klineMap = new Map<string, Awaited<ReturnType<typeof getKlines>>["data"]>();
    await Promise.all(
      [...focal].map(async (sym) => {
        try {
          const k = await getKlines(SYMBOL_TO_CURRENCY_ID[sym] ?? sym, "1m", 480);
          klineMap.set(sym, k.data);
        } catch {
          // leave unset → impact falls back to heuristic for that headline
        }
      }),
    );

    let measuredCount = 0;
    const items: NewsImpact[] = news.map((n, i) => {
      const sym = (n.symbols ?? [])[0] ?? "BTC";
      const klines = klineMap.get(sym);
      const sentiment = n.sentiment ?? deriveSentiment(n.title);
      const conviction = n.conviction ?? deriveConviction(n);
      const cls = classifyNews(n.title);

      let priceImpactPct: number;
      let reactionWindowMin: number;
      let decayHalfLifeMin: number;

      const impact = klines ? computePriceImpact(klines, n.publishedAt, 30) : null;
      if (impact) {
        measuredCount += 1;
        priceImpactPct = impact.priceImpactPct;
        reactionWindowMin = impact.reactionWindowMin;
        decayHalfLifeMin = impact.decayHalfLifeMin;
      } else {
        // Fallback estimate when no klines: sign from sentiment, small magnitude.
        const sign = sentiment === "bearish" ? -1 : sentiment === "bullish" ? 1 : 0;
        priceImpactPct = sign * 0.8;
        reactionWindowMin = 30;
        decayHalfLifeMin = 60;
      }

      return {
        id: n.id ?? `news_${i}`,
        title: n.title,
        source: n.source,
        publishedAt: n.publishedAt,
        sentiment,
        conviction,
        symbols: n.symbols ?? [sym],
        priceImpactPct,
        reactionWindowMin,
        decayHalfLifeMin,
        classification: cls,
        aiSummary:
          impact != null
            ? `Measured ${priceImpactPct >= 0 ? "+" : ""}${priceImpactPct}% over ${reactionWindowMin}m after release; impact half-life ≈ ${decayHalfLifeMin}m.`
            : `Derived ${sentiment} read from headline; price-window measurement unavailable for ${sym}.`,
      };
    });

    const source =
      measuredCount > 0
        ? `SoSoValue/news + klines (${measuredCount}/${items.length} price-measured)`
        : "SoSoValue/news + derived (klines unavailable)";
    return { items, source };
  } catch (err) {
    return { items: buildNewsImpacts(limit), source: `internal/impact-engine (fallback: ${(err as Error).message.slice(0, 60)})` };
  }
}

// ---------------------------------------------------------------------------
// Multi-source contradiction detection — the signature hook.
//
// Each contradiction cites TWO real API surfaces. Checks:
//   1. news bias  vs  sector breadth        (SoSoValue news  ×  SoSoValue sectors)
//   2. news bias  vs  SoDEX taker-buy ratio  (SoSoValue news  ×  SoDEX trades)
//   3. news bias  vs  perps funding rate     (SoSoValue news  ×  SoDEX mark-prices)
//   4. macro window proximity vs sector risk-on breadth (SoSoValue macro × sectors)
// ---------------------------------------------------------------------------

export async function detectContradictions(): Promise<{ items: Contradiction[]; source: string }> {
  const now = Date.now();
  const items: Contradiction[] = [];
  const surfaces: string[] = [];

  // No SoSoValue key → nothing real to cross-check; return offline preview note.
  if (!hasSosoKey() && !hasSodexKey()) {
    return { items: buildContradictions(), source: "internal/contradiction-engine (offline preview)" };
  }

  // --- Pull the inputs we have access to ---
  let news: NewsItem[] = [];
  let newsBias = 0;
  let bullishNews = 0;
  let bearishNews = 0;
  if (hasSosoKey()) {
    try {
      const n = await getNews(10);
      news = n.data ?? [];
      for (const item of news) {
        const s = item.sentiment ?? deriveSentiment(item.title);
        if (s === "bullish") bullishNews += 1;
        else if (s === "bearish") bearishNews += 1;
      }
      newsBias = bullishNews - bearishNews;
      surfaces.push("SoSoValue/news");
    } catch {
      /* ignore */
    }
  }

  // Check 1 + 4 need sectors + macro
  if (hasSosoKey()) {
    try {
      const sectorsRes = await getSectorSpotlight();
      const sectors = sectorsRes.data ?? [];
      const sectorBreadth = sectors.reduce((acc, s) => acc + (s.change24h > 0 ? 1 : -1), 0);
      surfaces.push("SoSoValue/sectors");

      // Check 1: news bias vs sector breadth
      if (newsBias !== 0 && Math.sign(sectorBreadth) !== Math.sign(newsBias)) {
        items.push({
          id: `contra_breadth_${now}`,
          title: "News bias and sector breadth disagree",
          signalA: { label: "News bias", value: `${newsBias >= 0 ? "+" : ""}${newsBias}`, source: "SoSoValue news" },
          signalB: { label: "Sector breadth", value: `${sectorBreadth >= 0 ? "+" : ""}${sectorBreadth} sectors`, source: "SoSoValue sectors" },
          severity: "high",
          confidence: 82,
          resolution: "Headline tone is tactical until breadth confirms — treat single-name leadership skeptically.",
          detectedAt: now,
        });
      }

      // Check 4: macro window proximity vs risk-on breadth
      const macroRes = await getMacroEvents().catch(() => ({ data: [] }));
      const macro = macroRes.data ?? [];
      const soon = macro
        .filter((m) => m.importance === "high")
        .map((m) => m.scheduledAt - now)
        .filter((dt) => dt > 0 && dt < 24 * 3_600_000)
        .sort((a, b) => a - b)[0];
      if (soon != null && sectorBreadth > 0) {
        surfaces.push("SoSoValue/macro");
        const hrs = Math.round(soon / 3_600_000);
        items.push({
          id: `contra_macro_${now}`,
          title: "Risk-on breadth into a high-impact macro window",
          signalA: { label: "Sector breadth", value: `+${sectorBreadth} sectors`, source: "SoSoValue sectors" },
          signalB: { label: "Macro event", value: `T-${hrs}h (high impact)`, source: "SoSoValue macro" },
          severity: "medium",
          confidence: 74,
          resolution: "Pre-event rallies often unwind; treat breadth as tactical until the print clears.",
          detectedAt: now,
        });
      }
    } catch {
      /* ignore */
    }
  }

  // Checks 2 + 3 need SoDEX. Anchor on the most-mentioned symbol, default BTC.
  if (hasSodexKey() && newsBias !== 0) {
    const focalSym = topSymbol(news) ?? "BTC";
    const pair = toSodexPair(focalSym);
    try {
      const trades = await getRecentTrades(pair, 60);
      const stats = takerBuyStats(trades.data);
      surfaces.push("SoDEX/trades");
      // Check 2: news bias vs taker-buy ratio
      const takerBullish = stats.takerBuyRatio > 0.52;
      const takerBearish = stats.takerBuyRatio < 0.48;
      const newsBullish = newsBias > 0;
      if ((newsBullish && takerBearish) || (!newsBullish && takerBullish)) {
        items.push({
          id: `contra_taker_${now}`,
          title: `News tone and ${pair} taker flow disagree`,
          signalA: { label: "News bias", value: `${newsBias >= 0 ? "+" : ""}${newsBias}`, source: "SoSoValue news" },
          signalB: { label: "Taker-buy ratio", value: `${(stats.takerBuyRatio * 100).toFixed(1)}%`, source: `SoDEX ${pair} trades` },
          severity: "medium",
          confidence: 76,
          resolution: "Tape is fading the headline; watch for flow to confirm before sizing.",
          detectedAt: now,
        });
      }
    } catch {
      /* ignore */
    }

    try {
      const marks = await getMarkPrices();
      surfaces.push("SoDEX/mark-prices");
      const perpSym = marks.data.find((m) => m.symbol.toUpperCase().includes(focalSym));
      if (perpSym) {
        // Check 3: news bias vs funding rate
        const fundingBullish = perpSym.fundingRate > 0.0001;
        const fundingBearish = perpSym.fundingRate < -0.0001;
        const newsBullish = newsBias > 0;
        if ((newsBullish && fundingBearish) || (!newsBullish && fundingBullish)) {
          items.push({
            id: `contra_funding_${now}`,
            title: `News tone and ${perpSym.symbol} funding disagree`,
            signalA: { label: "News bias", value: `${newsBias >= 0 ? "+" : ""}${newsBias}`, source: "SoSoValue news" },
            signalB: { label: "Funding rate", value: `${(perpSym.fundingRate * 100).toFixed(4)}%`, source: `SoDEX ${perpSym.symbol} perps` },
            severity: fundingBearish ? "high" : "medium",
            confidence: 79,
            resolution: "Derivatives positioning leans against the headline — a funding flip is the tell.",
            detectedAt: now,
          });
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (items.length === 0) {
    // Genuinely no disagreement detected across surfaces.
    return {
      items: [],
      source: surfaces.length
        ? `contradiction-engine: no disagreement across ${[...new Set(surfaces)].join(", ")}`
        : "internal/contradiction-engine (no live surfaces)",
    };
  }

  return {
    items,
    source: `contradiction-engine across ${[...new Set(surfaces)].join(", ")}`,
  };
}

function topSymbol(news: NewsItem[]): string | undefined {
  const counts = new Map<string, number>();
  for (const n of news) {
    for (const s of n.symbols ?? []) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestN = 0;
  for (const [s, c] of counts) {
    if (c > bestN) {
      best = s;
      bestN = c;
    }
  }
  return best;
}
