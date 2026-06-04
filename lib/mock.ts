import type {
  AlertItem,
  AssetDeepDive,
  Contradiction,
  IntelligenceSummary,
  NarrativeMomentum,
  NewsImpact,
  PersonalInsight,
  SentimentPoint,
  SeriesPoint,
  WatchlistItem,
} from "./types";
import type { MacroEvent, NewsItem, SectorSpotlightItem } from "./sosovalue";
import type { Orderbook, SodexTicker, SodexTrade } from "./sodex";

// Deterministic time-bucketed generators. The seed advances every minute or
// hour, so panels feel alive across reloads while remaining reproducible
// for the demo.

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOUR_MS = 3_600_000;
const MIN_MS = 60_000;

function bucketSeed(bucketMs: number) {
  return Math.floor(Date.now() / bucketMs);
}

function round(n: number, places = 2) {
  const m = 10 ** places;
  return Math.round(n * m) / m;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function buildSeries(points = 36): SeriesPoint[] {
  const rand = mulberry32(bucketSeed(MIN_MS));
  let btc = 100;
  let eth = 100;
  let index = 100;
  let ai = 100;
  let sentiment = 52;
  const out: SeriesPoint[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const drift = (rand() - 0.5) * 1.4;
    btc += drift + 0.12;
    eth += drift * 1.15 + 0.18;
    index += drift * 0.55 + 0.08;
    ai += drift * 1.6 + 0.32;
    sentiment = clamp(sentiment + (rand() - 0.5) * 4, 18, 86);
    const ts = Date.now() - i * HOUR_MS;
    out.push({
      t: new Date(ts).toISOString().slice(11, 16),
      ts,
      btc: round(btc),
      eth: round(eth),
      index: round(index),
      ai: round(ai),
      sentiment: round(sentiment, 1),
    });
  }
  return out;
}

export function buildSentimentSeries(points = 24): SentimentPoint[] {
  const rand = mulberry32(bucketSeed(MIN_MS));
  let bull = 52;
  let bear = 30;
  const out: SentimentPoint[] = [];
  for (let i = points - 1; i >= 0; i--) {
    bull = clamp(bull + (rand() - 0.45) * 5, 24, 80);
    bear = clamp(bear + (rand() - 0.55) * 5, 12, 62);
    const neutral = clamp(100 - bull - bear, 4, 40);
    const ts = Date.now() - i * HOUR_MS;
    out.push({
      t: new Date(ts).toISOString().slice(11, 16),
      ts,
      bull: round(bull, 1),
      bear: round(bear, 1),
      neutral: round(neutral, 1),
      net: round(bull - bear, 1),
    });
  }
  return out;
}

export function buildIntelligenceSummary(): IntelligenceSummary {
  const series = buildSeries(36);
  const last = series[series.length - 1];
  const prev = series[Math.max(0, series.length - 24)];
  const alpha24h = round(last.eth - prev.eth, 2);
  const conviction = clamp(round(54 + (last.sentiment - 50) * 0.9, 0), 18, 96);
  const regime: IntelligenceSummary["regime"] =
    last.sentiment > 64 ? "Risk-On" : last.sentiment > 48 ? "Mixed" : last.sentiment > 34 ? "Defensive" : "Risk-Off";
  const macroRisk: IntelligenceSummary["macroRisk"] =
    conviction > 75 ? "Low" : conviction > 55 ? "Moderate" : conviction > 35 ? "Elevated" : "High";
  const newsVelocity: IntelligenceSummary["newsVelocity"] =
    alpha24h > 4 ? "Surge" : alpha24h > 1 ? "High" : alpha24h > -1 ? "Normal" : "Low";
  return {
    regime,
    signalConfidence: conviction,
    macroRisk,
    newsVelocity,
    contradictionCount: 3,
    narrativesTracked: 6,
    updatedAt: Date.now(),
    alpha24h,
    topNarrative: alpha24h >= 0 ? "AI infrastructure rotation" : "Macro de-risking flow",
  };
}

const HEADLINES: {
  title: string;
  source: string;
  sentiment: NewsItem["sentiment"];
  symbols: string[];
  classification: NewsImpact["classification"];
  aiSummary: string;
}[] = [
  {
    title: "Spot BTC ETF inflows hit a 5-day streak as macro risk eases",
    source: "SoSoValue Terminal",
    sentiment: "bullish",
    symbols: ["BTC"],
    classification: "flow",
    aiSummary: "Institutional flow returning to BTC; supports large-cap upside continuation.",
  },
  {
    title: "AI sector beta climbs 8.2% — TAO and RNDR lead the tape",
    source: "SoSoValue Sectors",
    sentiment: "bullish",
    symbols: ["TAO", "RNDR", "FET"],
    classification: "narrative",
    aiSummary: "AI-narrative tokens outperforming; breadth confirms rotation, not single-name pump.",
  },
  {
    title: "ETH staking yield compresses as validator queue clears",
    source: "SoSoValue Terminal",
    sentiment: "neutral",
    symbols: ["ETH"],
    classification: "tech",
    aiSummary: "Lower staking yield reduces fixed-income appeal but signals network maturity.",
  },
  {
    title: "FOMC minutes lean dovish — risk assets bid into close",
    source: "SoSoValue Macro",
    sentiment: "bullish",
    symbols: ["BTC", "ETH"],
    classification: "macro",
    aiSummary: "Macro tailwind; rate-path softening lifts long-duration risk including crypto majors.",
  },
  {
    title: "Solana DEX volume rotates back above $4B/day",
    source: "SoSoValue Sectors",
    sentiment: "bullish",
    symbols: ["SOL"],
    classification: "flow",
    aiSummary: "On-chain activity supports SOL strength independent of BTC beta.",
  },
  {
    title: "Stablecoin supply contraction continues — defensive tilt warranted",
    source: "SoSoValue Terminal",
    sentiment: "bearish",
    symbols: ["USDC", "USDT"],
    classification: "flow",
    aiSummary: "Shrinking dry powder reduces marginal-buyer pool; risk regime turns more sensitive.",
  },
  {
    title: "DeFi TVL diverges from price — quiet capital rotation",
    source: "SoSoValue Sectors",
    sentiment: "neutral",
    symbols: ["AAVE", "UNI"],
    classification: "narrative",
    aiSummary: "Capital is moving but price hasn't followed; watch for catch-up or fade signal.",
  },
  {
    title: "Memecoin volatility spikes — risk regime sensitive",
    source: "SoSoValue Risk",
    sentiment: "bearish",
    symbols: ["PEPE", "WIF"],
    classification: "narrative",
    aiSummary: "Tail-volatility blow-off historically precedes broader risk-off pulses.",
  },
  {
    title: "Regulator publishes draft staking guidance — neutral framing",
    source: "SoSoValue Terminal",
    sentiment: "neutral",
    symbols: ["ETH"],
    classification: "regulatory",
    aiSummary: "Draft is non-binding but reduces tail uncertainty for staking products.",
  },
  {
    title: "CPI surprises to the downside — risk-on bid across crypto basket",
    source: "SoSoValue Macro",
    sentiment: "bullish",
    symbols: ["BTC", "ETH", "SOL"],
    classification: "macro",
    aiSummary: "Cooler inflation eases real-yield headwind; supports duration-sensitive risk assets.",
  },
];

export function buildNewsImpacts(limit = 8): NewsImpact[] {
  const rand = mulberry32(bucketSeed(HOUR_MS));
  const now = Date.now();
  const pool = [...HEADLINES];
  const out: NewsImpact[] = [];
  for (let i = 0; i < Math.min(limit, pool.length); i++) {
    const pickIdx = Math.floor(rand() * pool.length);
    const item = pool.splice(pickIdx, 1)[0];
    const sign = item.sentiment === "bearish" ? -1 : item.sentiment === "neutral" ? 0 : 1;
    const magnitude = round(0.6 + rand() * 3.6, 2);
    out.push({
      id: `news_${now - i * 9 * MIN_MS}`,
      title: item.title,
      source: item.source,
      publishedAt: now - i * 9 * MIN_MS,
      sentiment: item.sentiment ?? "neutral",
      conviction: clamp(round(58 + (rand() - 0.4) * 32, 0), 28, 96),
      symbols: item.symbols,
      priceImpactPct: round(sign * magnitude, 2),
      reactionWindowMin: clamp(Math.floor(8 + rand() * 80), 5, 120),
      decayHalfLifeMin: clamp(Math.floor(20 + rand() * 180), 15, 240),
      classification: item.classification,
      aiSummary: item.aiSummary,
    });
  }
  return out;
}

export function buildNewsItems(limit = 8): NewsItem[] {
  return buildNewsImpacts(limit).map((n) => ({
    id: n.id,
    title: n.title,
    source: n.source,
    publishedAt: n.publishedAt,
    sentiment: n.sentiment,
    conviction: n.conviction,
    symbols: n.symbols,
  }));
}

const SECTORS: { sector: string; tokens: string[] }[] = [
  { sector: "AI", tokens: ["FET", "RNDR", "TAO", "AGIX", "WLD"] },
  { sector: "L1", tokens: ["BTC", "ETH", "SOL", "AVAX", "ADA"] },
  { sector: "L2", tokens: ["ARB", "OP", "MATIC", "STRK"] },
  { sector: "DeFi", tokens: ["UNI", "AAVE", "MKR", "CRV", "LDO"] },
  { sector: "Memes", tokens: ["DOGE", "PEPE", "WIF", "BONK"] },
  { sector: "RWA", tokens: ["ONDO", "MKR", "PENDLE"] },
];

export function buildSectorSpotlight(): SectorSpotlightItem[] {
  const rand = mulberry32(bucketSeed(MIN_MS));
  return SECTORS.map((s) => {
    const change24h = round((rand() - 0.4) * 14, 2);
    const top = s.tokens[Math.floor(rand() * s.tokens.length)];
    const bot = s.tokens[Math.floor(rand() * s.tokens.length)];
    return {
      sector: s.sector,
      change24h,
      marketCap: round(2_000_000_000 + rand() * 80_000_000_000, 0),
      topGainer: top,
      topGainerChange: round(Math.abs(change24h) + rand() * 4, 2),
      topLoser: bot,
      topLoserChange: round(-Math.abs(change24h) - rand() * 4, 2),
    };
  });
}

// Offline-preview contradictions.
//
// NOTE: the prior hardcoded entries (fabricated funding/CPI/dominance numbers)
// were removed in Wave 2 — they cited fake data and overclaimed. The REAL
// cross-source detector lives in lib/marketmind.ts (detectContradictions),
// which computes contradictions from live SoSoValue + SoDEX surfaces.
//
// This function now derives a single, honest contradiction from the SAME
// deterministic mock that drives the rest of the offline demo: it compares the
// mock news bias against the mock sector breadth. When they disagree it emits
// one flag; otherwise it returns none. No invented funding/CPI/dominance figures.
export function buildContradictions(): Contradiction[] {
  const now = Date.now();
  const news = buildNewsImpacts(8);
  const sectors = buildSectorSpotlight();
  const bull = news.filter((n) => n.sentiment === "bullish").length;
  const bear = news.filter((n) => n.sentiment === "bearish").length;
  const newsBias = bull - bear;
  const breadth = sectors.reduce((acc, s) => acc + (s.change24h > 0 ? 1 : -1), 0);

  const out: Contradiction[] = [];
  if (newsBias !== 0 && Math.sign(breadth) !== Math.sign(newsBias)) {
    out.push({
      id: `contra_preview_${now}`,
      title: "News bias and sector breadth disagree (offline preview)",
      signalA: { label: "News bias", value: `${newsBias >= 0 ? "+" : ""}${newsBias}`, source: "mock news" },
      signalB: { label: "Sector breadth", value: `${breadth >= 0 ? "+" : ""}${breadth} sectors`, source: "mock sectors" },
      severity: "medium",
      confidence: 70,
      resolution: "Offline preview — connect SoSoValue + SoDEX keys for live cross-source detection.",
      detectedAt: now,
    });
  }
  return out;
}

export function buildNarratives(): NarrativeMomentum[] {
  const rand = mulberry32(bucketSeed(HOUR_MS));
  const base: { narrative: string; symbols: string[] }[] = [
    { narrative: "AI infrastructure rotation", symbols: ["FET", "RNDR", "TAO"] },
    { narrative: "ETF flow reacceleration", symbols: ["BTC", "ETH"] },
    { narrative: "Restaking thesis", symbols: ["EIGEN", "ETH"] },
    { narrative: "Real-world assets", symbols: ["ONDO", "MKR", "PENDLE"] },
    { narrative: "L2 fees compression", symbols: ["ARB", "OP", "STRK"] },
    { narrative: "Memecoin tail-vol", symbols: ["DOGE", "PEPE", "WIF"] },
  ];
  return base.map((b) => {
    const velocity = clamp(round(40 + (rand() - 0.4) * 50, 0), 12, 96);
    const breadth = clamp(round(40 + (rand() - 0.4) * 50, 0), 12, 96);
    const persistence = clamp(round(40 + (rand() - 0.4) * 50, 0), 12, 96);
    const score = (velocity + breadth + persistence) / 3;
    const state: NarrativeMomentum["state"] =
      score < 35 ? "fading" : score < 55 ? "emerging" : score < 78 ? "accelerating" : "peaking";
    return {
      narrative: b.narrative,
      velocity,
      breadth,
      persistence,
      topSymbols: b.symbols,
      priceProxy: round((rand() - 0.4) * 12, 2),
      state,
    };
  });
}

export function buildAssetDeepDive(symbol = "ETH"): AssetDeepDive {
  const rand = mulberry32(bucketSeed(MIN_MS));
  const base = symbol === "BTC" ? 62000 : symbol === "SOL" ? 142 : 3050;
  const change24h = round((rand() - 0.4) * 6, 2);
  const candles = Array.from({ length: 24 }, (_, i) => {
    const drift = (rand() - 0.5) * 0.012;
    const o = round(base * (1 + drift * (i - 12)), 2);
    const c = round(o * (1 + (rand() - 0.5) * 0.01), 2);
    const h = round(Math.max(o, c) * (1 + rand() * 0.006), 2);
    const l = round(Math.min(o, c) * (1 - rand() * 0.006), 2);
    return { t: `T-${23 - i}h`, o, h, l, c };
  });
  return {
    symbol,
    price: round(base * (1 + change24h / 100), 2),
    change24h,
    drivers: [
      { label: "ETF flow", weight: clamp(round(40 + (rand() - 0.5) * 30, 0), 10, 92), direction: "+" },
      { label: "News conviction", weight: clamp(round(55 + (rand() - 0.5) * 20, 0), 10, 92), direction: "+" },
      { label: "Macro tailwind", weight: clamp(round(35 + (rand() - 0.5) * 30, 0), 10, 92), direction: "=" },
      { label: "Derivatives skew", weight: clamp(round(28 + (rand() - 0.5) * 22, 0), 10, 92), direction: "-" },
    ],
    supportingNews: [
      "Spot BTC ETF inflows hit a 5-day streak as macro risk eases",
      "FOMC minutes lean dovish — risk assets bid into close",
      "Solana DEX volume rotates back above $4B/day",
    ],
    related: [
      { symbol: "BTC", corr: round(0.72 + (rand() - 0.5) * 0.1, 2) },
      { symbol: "SOL", corr: round(0.58 + (rand() - 0.5) * 0.1, 2) },
      { symbol: "ARB", corr: round(0.45 + (rand() - 0.5) * 0.1, 2) },
    ],
    aiNarrative:
      symbol === "BTC"
        ? "BTC strength is flow-led: ETF inflows + softening macro + stable dominance = continuation bias unless funding turns euphoric."
        : symbol === "SOL"
          ? "SOL move is on-chain-led: DEX volume confirms strength independent of BTC beta; watch for memecoin reflexivity."
          : "ETH move is ETF-led with macro tailwind; derivatives skew flags fade-risk if funding turns positive too quickly.",
    candles,
    beta: round(0.85 + (rand() - 0.5) * 0.4, 2),
    zscore: round((rand() - 0.5) * 2.5, 2),
  };
}

export function buildWatchlist(): WatchlistItem[] {
  const rand = mulberry32(bucketSeed(MIN_MS));
  return [
    {
      symbol: "BTC",
      thesis: "Macro barometer; lead sensitivity to ETF flow + rate path.",
      beta: 1.0,
      exposureNote: "Core risk anchor — moves first in regime shifts.",
      priceChange24h: round((rand() - 0.5) * 4, 2),
      riskTone: "watch",
    },
    {
      symbol: "ETH",
      thesis: "Captures institutional rotation faster than peers.",
      beta: 1.05,
      exposureNote: "ETF momentum + staking yield compression in focus.",
      priceChange24h: round((rand() - 0.4) * 5, 2),
      riskTone: "calm",
    },
    {
      symbol: "FET",
      thesis: "High-conviction AI narrative beta.",
      beta: 1.7,
      exposureNote: "Reacts violently to AI flow shifts; size accordingly.",
      priceChange24h: round((rand() - 0.4) * 9, 2),
      riskTone: "alert",
    },
    {
      symbol: "SOL",
      thesis: "On-chain activity proxy independent of BTC beta.",
      beta: 1.3,
      exposureNote: "Memecoin reflexivity is the main divergence risk.",
      priceChange24h: round((rand() - 0.4) * 6, 2),
      riskTone: "watch",
    },
  ];
}

export function buildPersonalInsights(): PersonalInsight[] {
  const now = Date.now();
  return [
    {
      id: `ins_${now - 3 * MIN_MS}`,
      symbol: "BTC",
      title: "BTC in your watchlist is sensitive to tomorrow's CPI print",
      body: "Three of the last four CPI prints triggered ±2.4% BTC moves within 30 minutes. Your watchlist beta is dominated by BTC, so factor event risk into sizing.",
      confidence: 82,
      evidence: [
        "Macro calendar: CPI in 18h",
        "Realized vol last 4 CPI windows: 2.4% avg",
        "BTC weight in your watchlist: 38%",
      ],
      generatedAt: now - 3 * MIN_MS,
    },
    {
      id: `ins_${now - 14 * MIN_MS}`,
      symbol: "ETH",
      title: "ETH showing stronger institutional flow than peers",
      body: "Spot ETH ETF net inflows lead spot BTC for the third consecutive day. Historically this divergence narrows within 5 sessions; treat as tactical, not structural.",
      confidence: 71,
      evidence: [
        "ETF net flow ratio: ETH 1.4× BTC over 3d",
        "Funding rate: ETH +0.012% vs. BTC +0.004%",
        "Historical narrowing window: median 4 sessions",
      ],
      generatedAt: now - 14 * MIN_MS,
    },
    {
      id: `ins_${now - 41 * MIN_MS}`,
      symbol: "FET",
      title: "FET volatility expanding — your watchlist beta has crept up",
      body: "FET realized vol is up 28% week-over-week. Your blended watchlist beta moved from 1.18 to 1.34 because of position weight, even though no rebalance happened.",
      confidence: 76,
      evidence: [
        "FET 7d realized vol: 84% (vs 66% prior)",
        "Blended watchlist beta: 1.34 (was 1.18)",
        "Trigger: AI narrative momentum 'accelerating'",
      ],
      generatedAt: now - 41 * MIN_MS,
    },
  ];
}

export function buildAlerts(): AlertItem[] {
  const now = Date.now();
  return [
    {
      id: `alert_${now - 2 * MIN_MS}`,
      category: "risk",
      message: "Volatility spike: BTC 30-min RV +14% — exposure-sensitive watchers take note.",
      severity: "warn",
      ts: now - 2 * MIN_MS,
    },
    {
      id: `alert_${now - 9 * MIN_MS}`,
      category: "sector",
      message: "Sector shift: AI breadth overtook DeFi flows for the first time in 5 sessions.",
      severity: "info",
      ts: now - 9 * MIN_MS,
    },
    {
      id: `alert_${now - 18 * MIN_MS}`,
      category: "macro",
      message: "Macro alert: Fed commentary scheduled in 3 hours — directional uncertainty rising.",
      severity: "watch",
      ts: now - 18 * MIN_MS,
    },
    {
      id: `alert_${now - 32 * MIN_MS}`,
      category: "narrative",
      message: "Narrative 'AI infrastructure rotation' moved from emerging → accelerating.",
      severity: "info",
      ts: now - 32 * MIN_MS,
    },
  ];
}

export function buildMacroEvents(): MacroEvent[] {
  const now = Date.now();
  return [
    {
      id: `macro_${now}_cpi`,
      title: "US CPI (YoY)",
      category: "inflation",
      scheduledAt: now + 18 * HOUR_MS,
      surprise: undefined,
      importance: "high",
    },
    {
      id: `macro_${now}_fomc`,
      title: "Fed Chair commentary",
      category: "rate",
      scheduledAt: now + 3 * HOUR_MS,
      importance: "high",
    },
    {
      id: `macro_${now}_jobs`,
      title: "Initial jobless claims",
      category: "jobs",
      scheduledAt: now + 30 * HOUR_MS,
      importance: "medium",
    },
  ];
}

// ---------------------------------------------------------------------------
// SoDEX read-only intelligence mocks. MarketMind reads order-book microstructure
// purely as a signal — spread, depth imbalance, taker bias — never to trade.
// ---------------------------------------------------------------------------

const SODEX_PAIRS = ["BTC-USDT", "ETH-USDT", "SOL-USDT", "ARB-USDT", "FET-USDT"];

function refPriceFor(symbol: string): number {
  if (symbol.startsWith("BTC")) return 62000;
  if (symbol.startsWith("ETH")) return 3050;
  if (symbol.startsWith("SOL")) return 142;
  if (symbol.startsWith("ARB")) return 0.92;
  if (symbol.startsWith("FET")) return 1.42;
  return 100;
}

export function buildOrderbook(symbol = "ETH-USDT"): Orderbook {
  const rand = mulberry32(bucketSeed(MIN_MS) ^ hashString(symbol));
  const ref = refPriceFor(symbol);
  const tick = ref < 5 ? 0.0005 : ref < 200 ? 0.05 : 1;
  const bids: { price: number; size: number }[] = [];
  const asks: { price: number; size: number }[] = [];
  for (let i = 1; i <= 8; i++) {
    bids.push({
      price: round(ref - tick * i, ref < 5 ? 4 : 2),
      size: round(0.4 + rand() * 5.2, 3),
    });
    asks.push({
      price: round(ref + tick * i, ref < 5 ? 4 : 2),
      size: round(0.4 + rand() * 5.2, 3),
    });
  }
  const bidDepth = bids.reduce((s, b) => s + b.size, 0);
  const askDepth = asks.reduce((s, a) => s + a.size, 0);
  const depthImbalance = round((bidDepth - askDepth) / (bidDepth + askDepth), 3);
  const spreadBps = round(((asks[0].price - bids[0].price) / ref) * 10_000, 1);
  return { symbol, bids, asks, spreadBps, depthImbalance };
}

export function buildSodexTicker(symbol = "ETH-USDT"): SodexTicker {
  const rand = mulberry32(bucketSeed(MIN_MS) ^ hashString(symbol));
  const ref = refPriceFor(symbol);
  const change24h = round((rand() - 0.45) * 6, 2);
  return {
    symbol,
    last: round(ref * (1 + change24h / 100), ref < 5 ? 4 : 2),
    change24h,
    volume24h: round(2_000_000 + rand() * 80_000_000, 0),
    takerBuyRatio: round(0.46 + (rand() - 0.5) * 0.16, 3),
  };
}

export function buildSodexTickers(): SodexTicker[] {
  return SODEX_PAIRS.map((p) => buildSodexTicker(p));
}

export function buildSodexTrades(symbol = "ETH-USDT", count = 24): SodexTrade[] {
  const rand = mulberry32(bucketSeed(MIN_MS) ^ hashString(symbol));
  const ref = refPriceFor(symbol);
  const out: SodexTrade[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    out.push({
      id: `tr_${now - i * 7_000}_${symbol}`,
      symbol,
      side: rand() > 0.52 ? "BUY" : "SELL",
      price: round(ref * (1 + (rand() - 0.5) * 0.004), ref < 5 ? 4 : 2),
      size: round(0.05 + rand() * 1.6, 3),
      ts: now - i * 7_000,
    });
  }
  return out;
}

export type SodexFlow = {
  symbol: string;
  takerBuyRatio: number;
  spreadBps: number;
  depthImbalance: number;
  netFlow1m: number;
  signal: "absorbing-bids" | "absorbing-offers" | "balanced" | "thin";
  note: string;
};

export function buildSodexFlow(): SodexFlow[] {
  const rand = mulberry32(bucketSeed(MIN_MS));
  return SODEX_PAIRS.map((symbol) => {
    const ob = buildOrderbook(symbol);
    const ticker = buildSodexTicker(symbol);
    const netFlow1m = round((rand() - 0.45) * 1_400_000, 0);
    const signal: SodexFlow["signal"] =
      ob.spreadBps > 12
        ? "thin"
        : ticker.takerBuyRatio > 0.55
          ? "absorbing-offers"
          : ticker.takerBuyRatio < 0.45
            ? "absorbing-bids"
            : "balanced";
    const note =
      signal === "absorbing-offers"
        ? "Taker-buy share dominant; passive sellers being lifted."
        : signal === "absorbing-bids"
          ? "Taker-sell share dominant; passive buyers being hit."
          : signal === "thin"
            ? "Spread wide vs. baseline — liquidity thinning, treat fills as expensive."
            : "Two-way flow; no directional microstructure tell.";
    return {
      symbol,
      takerBuyRatio: ticker.takerBuyRatio,
      spreadBps: ob.spreadBps,
      depthImbalance: ob.depthImbalance,
      netFlow1m,
      signal,
      note,
    };
  });
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Staking + SSI Protocol intelligence mocks.
// SSI = SoSoValue's on-chain spot index protocol; we surface index basket
// composition + drift as a research/insight signal.
// ---------------------------------------------------------------------------

export type StakingYield = {
  asset: string;
  protocol: string;
  apy: number;
  apy7dDelta: number;
  tvlUsd: number;
  riskTier: "low" | "moderate" | "elevated";
  note: string;
};

export function buildStakingYields(): StakingYield[] {
  const rand = mulberry32(bucketSeed(HOUR_MS));
  const base: Omit<StakingYield, "apy7dDelta" | "apy" | "tvlUsd">[] = [
    { asset: "ETH", protocol: "Native staking", riskTier: "low", note: "Validator queue cleared; entry latency improving." },
    { asset: "ETH", protocol: "Lido (stETH)", riskTier: "moderate", note: "Liquid staking peg held through last vol pulse." },
    { asset: "ETH", protocol: "EigenLayer restake", riskTier: "elevated", note: "Restaking risk premium widened with TVL inflows." },
    { asset: "SOL", protocol: "Native staking", riskTier: "low", note: "Validator commission landscape stable." },
    { asset: "SOL", protocol: "Marinade (mSOL)", riskTier: "moderate", note: "Liquid staking ratio tightening vs native." },
    { asset: "BTC", protocol: "Babylon BTC restake", riskTier: "elevated", note: "Early-stage restaking yield, shallow withdrawal liquidity." },
  ];
  return base.map((b) => {
    const apy = round(2.4 + rand() * 7.6, 2);
    return {
      ...b,
      apy,
      apy7dDelta: round((rand() - 0.5) * 0.8, 2),
      tvlUsd: round(800_000_000 + rand() * 30_000_000_000, 0),
    };
  });
}

export type SsiBasketWeight = {
  symbol: string;
  weight: number;
  drift7d: number; // pp drift vs target
  contribution24h: number; // % contribution to index move
};

export type SsiIndex = {
  index: string;
  level: number;
  change24h: number;
  drift: number; // composite drift score
  rebalanceWindow: string;
  basket: SsiBasketWeight[];
};

export function buildSsiIndices(): SsiIndex[] {
  const rand = mulberry32(bucketSeed(HOUR_MS));
  return [
    {
      index: "SSI-L1",
      level: round(102 + (rand() - 0.5) * 4, 2),
      change24h: round((rand() - 0.45) * 4, 2),
      drift: round(rand() * 2.4, 2),
      rebalanceWindow: "T+18h",
      basket: [
        { symbol: "BTC", weight: 48, drift7d: round((rand() - 0.5) * 1.2, 2), contribution24h: round((rand() - 0.5) * 1.6, 2) },
        { symbol: "ETH", weight: 28, drift7d: round((rand() - 0.5) * 1.0, 2), contribution24h: round((rand() - 0.5) * 1.6, 2) },
        { symbol: "SOL", weight: 14, drift7d: round((rand() - 0.5) * 1.4, 2), contribution24h: round((rand() - 0.5) * 1.6, 2) },
        { symbol: "AVAX", weight: 10, drift7d: round((rand() - 0.5) * 1.2, 2), contribution24h: round((rand() - 0.5) * 1.6, 2) },
      ],
    },
    {
      index: "SSI-AI",
      level: round(118 + (rand() - 0.5) * 6, 2),
      change24h: round((rand() - 0.4) * 7, 2),
      drift: round(rand() * 3.4, 2),
      rebalanceWindow: "T+42h",
      basket: [
        { symbol: "TAO", weight: 32, drift7d: round((rand() - 0.5) * 2.4, 2), contribution24h: round((rand() - 0.5) * 2.4, 2) },
        { symbol: "FET", weight: 26, drift7d: round((rand() - 0.5) * 2.4, 2), contribution24h: round((rand() - 0.5) * 2.4, 2) },
        { symbol: "RNDR", weight: 22, drift7d: round((rand() - 0.5) * 2.4, 2), contribution24h: round((rand() - 0.5) * 2.4, 2) },
        { symbol: "WLD", weight: 12, drift7d: round((rand() - 0.5) * 2.4, 2), contribution24h: round((rand() - 0.5) * 2.4, 2) },
        { symbol: "AGIX", weight: 8, drift7d: round((rand() - 0.5) * 2.4, 2), contribution24h: round((rand() - 0.5) * 2.4, 2) },
      ],
    },
    {
      index: "SSI-DeFi",
      level: round(94 + (rand() - 0.5) * 5, 2),
      change24h: round((rand() - 0.55) * 4, 2),
      drift: round(rand() * 2.0, 2),
      rebalanceWindow: "T+66h",
      basket: [
        { symbol: "AAVE", weight: 30, drift7d: round((rand() - 0.5) * 1.4, 2), contribution24h: round((rand() - 0.5) * 1.8, 2) },
        { symbol: "UNI", weight: 26, drift7d: round((rand() - 0.5) * 1.4, 2), contribution24h: round((rand() - 0.5) * 1.8, 2) },
        { symbol: "MKR", weight: 22, drift7d: round((rand() - 0.5) * 1.4, 2), contribution24h: round((rand() - 0.5) * 1.8, 2) },
        { symbol: "LDO", weight: 14, drift7d: round((rand() - 0.5) * 1.4, 2), contribution24h: round((rand() - 0.5) * 1.8, 2) },
        { symbol: "CRV", weight: 8, drift7d: round((rand() - 0.5) * 1.4, 2), contribution24h: round((rand() - 0.5) * 1.8, 2) },
      ],
    },
  ];
}
