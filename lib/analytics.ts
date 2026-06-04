// Shared, deterministic analytics used across the intelligence engine.
// These are REAL computations over whatever inputs are passed in — they do not
// invent data. Callers feed them live API data when keys are present, mock
// otherwise; the math is identical either way.

import type { Kline, NewsItem } from "./sosovalue";
import type { SodexTrade } from "./sodex";

// ---------------------------------------------------------------------------
// Derived news sentiment + conviction (the SoSoValue /news feed has NO native
// sentiment field — we derive our own from the headline text and engagement).
// ---------------------------------------------------------------------------

const BULLISH_TERMS = [
  "surge", "rally", "soar", "jump", "gain", "inflow", "inflows", "record", "high",
  "approve", "approval", "bullish", "buy", "accumulate", "upgrade", "beat", "adopt",
  "partnership", "launch", "breakout", "support", "dovish", "cuts", "cut",
];
const BEARISH_TERMS = [
  "drop", "fall", "plunge", "crash", "sell-off", "selloff", "outflow", "outflows",
  "bearish", "dump", "downgrade", "miss", "hack", "exploit", "lawsuit", "ban",
  "reject", "rejection", "liquidation", "liquidations", "fear", "hawkish", "hike",
  "warn", "warning", "decline", "slump",
];

export function deriveSentiment(title: string): "bullish" | "bearish" | "neutral" {
  const t = title.toLowerCase();
  let score = 0;
  for (const w of BULLISH_TERMS) if (t.includes(w)) score += 1;
  for (const w of BEARISH_TERMS) if (t.includes(w)) score -= 1;
  if (score > 0) return "bullish";
  if (score < 0) return "bearish";
  return "neutral";
}

// Conviction 0–100 from engagement (log-scaled) + headline term density.
export function deriveConviction(n: Pick<NewsItem, "title" | "engagement">): number {
  const e = n.engagement ?? {};
  const eng = (e.impression ?? 0) + 3 * (e.like ?? 0) + 2 * (e.retweet ?? 0) + (e.reply ?? 0);
  const engScore = eng > 0 ? Math.min(40, 8 * Math.log10(eng + 10)) : 12;
  const t = (n.title ?? "").toLowerCase();
  let terms = 0;
  for (const w of [...BULLISH_TERMS, ...BEARISH_TERMS]) if (t.includes(w)) terms += 1;
  const termScore = Math.min(40, terms * 12);
  return clamp(Math.round(40 + engScore + termScore - 20), 24, 96);
}

const CLASS_RULES: { cls: NewsImpactClass; terms: string[] }[] = [
  { cls: "macro", terms: ["cpi", "fed", "fomc", "rate", "inflation", "jobs", "macro", "treasury", "yield"] },
  { cls: "regulatory", terms: ["sec", "regulat", "lawsuit", "ban", "approve", "etf", "guidance", "court"] },
  { cls: "flow", terms: ["inflow", "outflow", "etf", "volume", "stablecoin", "liquidity", "whale"] },
  { cls: "tech", terms: ["upgrade", "mainnet", "staking", "validator", "fork", "protocol", "launch"] },
  { cls: "earnings", terms: ["earnings", "revenue", "profit", "guidance"] },
];

export type NewsImpactClass =
  | "macro" | "flow" | "regulatory" | "tech" | "narrative" | "earnings" | "other";

export function classifyNews(title: string): NewsImpactClass {
  const t = title.toLowerCase();
  for (const rule of CLASS_RULES) {
    if (rule.terms.some((w) => t.includes(w))) return rule.cls;
  }
  return "narrative";
}

// ---------------------------------------------------------------------------
// Price-impact computation: measure the ACTUAL return in the window after a
// headline, and estimate decay half-life from the post-event price path.
// ---------------------------------------------------------------------------

export type PriceImpact = {
  priceImpactPct: number; // signed return over the reaction window
  reactionWindowMin: number; // window used (minutes)
  decayHalfLifeMin: number; // minutes for the impact to halve from peak
  measured: boolean; // true when computed from real klines
};

// klines: ascending by time, {t: epoch ms}. releaseTs: headline time (ms).
export function computePriceImpact(
  klines: Kline[],
  releaseTs: number,
  windowMin = 30,
): PriceImpact | null {
  if (!klines || klines.length < 3) return null;
  const sorted = [...klines].sort((a, b) => a.t - b.t);
  // bar interval (ms) inferred from median spacing
  const spacing = inferSpacingMs(sorted);
  if (!spacing) return null;

  // anchor = last bar at/just before release
  let anchorIdx = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].t <= releaseTs) anchorIdx = i;
    else break;
  }
  if (anchorIdx < 0) anchorIdx = 0;
  const anchor = sorted[anchorIdx];
  const p0 = anchor.c;
  if (!p0) return null;

  const windowMs = windowMin * 60_000;
  const endTs = releaseTs + windowMs;
  const windowBars = sorted.filter((k) => k.t >= anchor.t && k.t <= endTs);
  if (windowBars.length < 2) return null;

  const pEnd = windowBars[windowBars.length - 1].c;
  const priceImpactPct = round(((pEnd - p0) / p0) * 100, 2);

  // peak |return| within window, then half-life = time to fall to half of peak.
  let peakRet = 0;
  let peakIdx = 0;
  windowBars.forEach((k, i) => {
    const r = (k.c - p0) / p0;
    if (Math.abs(r) > Math.abs(peakRet)) {
      peakRet = r;
      peakIdx = i;
    }
  });

  let decayHalfLifeMin = windowMin; // default: no decay observed within window
  if (Math.abs(peakRet) > 1e-6) {
    for (let i = peakIdx + 1; i < windowBars.length; i++) {
      const r = (windowBars[i].c - p0) / p0;
      if (Math.abs(r) <= Math.abs(peakRet) / 2) {
        decayHalfLifeMin = Math.max(1, Math.round(((windowBars[i].t - windowBars[peakIdx].t) / 60_000)));
        break;
      }
    }
  }

  return {
    priceImpactPct,
    reactionWindowMin: windowMin,
    decayHalfLifeMin,
    measured: true,
  };
}

function inferSpacingMs(sorted: Kline[]): number {
  const diffs: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i].t - sorted[i - 1].t;
    if (d > 0) diffs.push(d);
  }
  if (diffs.length === 0) return 0;
  diffs.sort((a, b) => a - b);
  return diffs[Math.floor(diffs.length / 2)];
}

// ---------------------------------------------------------------------------
// SoDEX taker-buy ratio + net flow from real trades
// ---------------------------------------------------------------------------

export function takerBuyStats(trades: SodexTrade[]) {
  if (!trades.length) return { takerBuyRatio: 0.5, netFlow: 0, buyVol: 0, sellVol: 0 };
  let buyVol = 0;
  let sellVol = 0;
  for (const t of trades) {
    const notional = t.price * t.size;
    if (t.side === "BUY") buyVol += notional;
    else sellVol += notional;
  }
  const total = buyVol + sellVol;
  const takerBuyRatio = total > 0 ? round(buyVol / total, 3) : 0.5;
  return { takerBuyRatio, netFlow: round(buyVol - sellVol, 0), buyVol, sellVol };
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function round(n: number, places = 2) {
  const m = 10 ** places;
  return Math.round(n * m) / m;
}

// Map a bare symbol (BTC) to a SoDEX pair (BTC-USDT) / perps symbol.
export function toSodexPair(symbol: string): string {
  const s = symbol.toUpperCase().replace(/-?USDT?$/i, "");
  return `${s}-USDT`;
}
