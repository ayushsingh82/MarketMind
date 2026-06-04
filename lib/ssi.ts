// SSI / index intelligence.
//
// Two surfaces:
//  1. Live SSI baskets — read /indices + /indices/{t}/constituents and join with
//     per-currency snapshots to compute live NAV, 24h change, and each
//     constituent's 24h contribution. Read-only research/comparison context.
//  2. The MarketMind Index — a COMPUTED, PUBLISHED methodology basket (market-cap
//     weighted with a single-name cap), NOT an on-chain mint. NAV is computed
//     from live constituent prices when a key is present, mock otherwise.

import {
  getIndexConstituents,
  getIndices,
  getMarketSnapshot,
  hasSosoKey,
  type MarketSnapshot,
} from "./sosovalue";
import { buildSsiIndices, type SsiIndex } from "./mock";
import { clamp, round } from "./analytics";

// ---------------------------------------------------------------------------
// Live SSI baskets
// ---------------------------------------------------------------------------

export async function buildLiveSsiIndices(): Promise<{ indices: SsiIndex[]; livePoints: number; source: string }> {
  if (!hasSosoKey()) {
    return { indices: buildSsiIndices(), livePoints: 0, source: "SSI Protocol (offline preview)" };
  }
  try {
    const idxRes = await getIndices();
    const indexList = idxRes.data ?? [];
    if (!indexList.length) {
      return { indices: buildSsiIndices(), livePoints: 0, source: "SSI/indices empty → mock" };
    }

    // One snapshot board for price lookups.
    const snapRes = await getMarketSnapshot().catch(() => ({ data: [] as MarketSnapshot[] }));
    const priceMap = new Map<string, MarketSnapshot>();
    for (const s of snapRes.data ?? []) priceMap.set(s.symbol.toUpperCase(), s);

    const indices: SsiIndex[] = [];
    let livePoints = 0;

    // Limit to the first few indices to stay within the rate budget.
    for (const idx of indexList.slice(0, 4)) {
      try {
        const consRes = await getIndexConstituents(idx.ticker);
        const cons = consRes.data ?? [];
        if (!cons.length) continue;
        livePoints += cons.length;

        // Normalize weights to %.
        const totalW = cons.reduce((s, c) => s + (c.weight || 0), 0) || 1;
        let weightedChange = 0;
        const basket = cons.map((c) => {
          const snap = priceMap.get(c.symbol.toUpperCase());
          const w = (c.weight / totalW) * 100;
          const change = snap?.change24h ?? 0;
          const contribution24h = round((w / 100) * change, 2);
          weightedChange += contribution24h;
          return {
            symbol: c.symbol.toUpperCase(),
            weight: round(w, 1),
            drift7d: 0, // not available from a single snapshot; reported as 0 (honest)
            contribution24h,
          };
        });

        indices.push({
          index: idx.ticker,
          level: round(idx.nav ?? 100 + weightedChange, 2),
          change24h: round(idx.change24h ?? weightedChange, 2),
          drift: round(Math.abs(weightedChange), 2),
          rebalanceWindow: "see methodology",
          basket,
        });
      } catch {
        /* skip this index */
      }
    }

    if (!indices.length) {
      return { indices: buildSsiIndices(), livePoints: 0, source: "SSI constituents unavailable → mock" };
    }
    return {
      indices,
      livePoints,
      source: "SoSoValue/indices + constituents + snapshot (live NAV/contribution)",
    };
  } catch (err) {
    return { indices: buildSsiIndices(), livePoints: 0, source: `SSI (fallback: ${(err as Error).message.slice(0, 60)})` };
  }
}

// ---------------------------------------------------------------------------
// The MarketMind Index (MMX) — computed, published methodology.
// ---------------------------------------------------------------------------

export type MmxConstituent = {
  symbol: string;
  targetWeight: number; // % after cap rule
  rawMarketCapWeight: number; // % before cap
  price: number;
  change24h: number;
  contribution24h: number;
};

export type MmxIndex = {
  name: string;
  ticker: string;
  methodology: {
    universe: string;
    weighting: string;
    singleNameCap: number; // %
    rebalance: string;
  };
  lastRebalanced: number; // epoch ms
  nav: number; // computed from constituent prices (rebased to 100 at inception weights)
  change24h: number;
  constituents: MmxConstituent[];
  convictionScore: number; // 0..100, engine's conviction in the basket
  source: string;
};

// Candidate universe for the MarketMind Index. Reference market caps (USD) are
// only used as a deterministic fallback when no live snapshot is available.
const MMX_UNIVERSE: { symbol: string; refCap: number; refPrice: number }[] = [
  { symbol: "BTC", refCap: 1_300_000_000_000, refPrice: 66000 },
  { symbol: "ETH", refCap: 420_000_000_000, refPrice: 3200 },
  { symbol: "SOL", refCap: 78_000_000_000, refPrice: 165 },
  { symbol: "BNB", refCap: 90_000_000_000, refPrice: 600 },
  { symbol: "AVAX", refCap: 14_000_000_000, refPrice: 35 },
  { symbol: "LINK", refCap: 11_000_000_000, refPrice: 18 },
  { symbol: "TAO", refCap: 4_000_000_000, refPrice: 480 },
  { symbol: "ONDO", refCap: 2_500_000_000, refPrice: 1.4 },
];

const SINGLE_NAME_CAP = 35; // %
// Inception timestamp for the published methodology (deterministic, demo-stable).
const MMX_INCEPTION = Date.UTC(2026, 4, 1); // 2026-05-01

export async function buildMarketMindIndex(): Promise<MmxIndex> {
  let snapshots: Map<string, MarketSnapshot> | null = null;
  let live = false;

  if (hasSosoKey()) {
    try {
      const snapRes = await getMarketSnapshot();
      if (snapRes.data?.length) {
        snapshots = new Map(snapRes.data.map((s) => [s.symbol.toUpperCase(), s]));
        live = true;
      }
    } catch {
      /* fall back to ref values */
    }
  }

  // 1. Raw market-cap weights.
  const rows = MMX_UNIVERSE.map((u) => {
    const snap = snapshots?.get(u.symbol);
    const price = snap?.price ?? u.refPrice;
    const change24h = snap?.change24h ?? 0;
    const cap = snap?.marketCap ?? u.refCap;
    return { symbol: u.symbol, price, change24h, cap };
  });
  const totalCap = rows.reduce((s, r) => s + r.cap, 0) || 1;
  const rawWeights = rows.map((r) => ({ ...r, rawWeight: (r.cap / totalCap) * 100 }));

  // 2. Apply single-name cap, redistribute excess proportionally to uncapped names.
  const capped = applySingleNameCap(rawWeights.map((r) => ({ symbol: r.symbol, weight: r.rawWeight })), SINGLE_NAME_CAP);

  const constituents: MmxConstituent[] = rawWeights.map((r) => {
    const targetWeight = capped.find((c) => c.symbol === r.symbol)?.weight ?? r.rawWeight;
    const contribution24h = round((targetWeight / 100) * r.change24h, 2);
    return {
      symbol: r.symbol,
      targetWeight: round(targetWeight, 1),
      rawMarketCapWeight: round(r.rawWeight, 1),
      price: round(r.price, r.price < 5 ? 4 : 2),
      change24h: round(r.change24h, 2),
      contribution24h,
    };
  });

  const change24h = round(constituents.reduce((s, c) => s + c.contribution24h, 0), 2);
  const nav = round(100 + change24h, 2); // rebased to 100, today's move applied

  // Conviction: higher when breadth is positive and concentrated leadership is healthy.
  const positives = constituents.filter((c) => c.change24h > 0).length;
  const breadth = positives / constituents.length;
  const convictionScore = clamp(Math.round(45 + breadth * 40 + (change24h > 0 ? 8 : -8)), 18, 95);

  return {
    name: "MarketMind Index",
    ticker: "MMX",
    methodology: {
      universe: "Top liquid crypto majors + highest-conviction narrative leaders (8 names)",
      weighting: "Market-cap weighted",
      singleNameCap: SINGLE_NAME_CAP,
      rebalance: "Monthly (1st, 00:00 UTC), or on >5pp single-name drift",
    },
    lastRebalanced: MMX_INCEPTION,
    nav,
    change24h,
    constituents,
    convictionScore,
    source: live
      ? "MarketMind Index — computed from SoSoValue live snapshot"
      : "MarketMind Index — computed from reference caps (offline preview)",
  };
}

// Cap each weight at `cap`%, redistribute the overflow proportionally to names
// still under the cap, iterating until stable.
function applySingleNameCap(
  weights: { symbol: string; weight: number }[],
  cap: number,
): { symbol: string; weight: number }[] {
  const w = weights.map((x) => ({ ...x }));
  for (let iter = 0; iter < 10; iter++) {
    const over = w.filter((x) => x.weight > cap);
    if (over.length === 0) break;
    let excess = 0;
    for (const x of over) {
      excess += x.weight - cap;
      x.weight = cap;
    }
    const under = w.filter((x) => x.weight < cap - 1e-9);
    const underTotal = under.reduce((s, x) => s + x.weight, 0) || 1;
    for (const x of under) {
      x.weight += (x.weight / underTotal) * excess;
    }
  }
  // Renormalize to 100 to absorb rounding.
  const total = w.reduce((s, x) => s + x.weight, 0) || 1;
  for (const x of w) x.weight = (x.weight / total) * 100;
  return w;
}
