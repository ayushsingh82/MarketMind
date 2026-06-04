// SoDEX read-only intelligence client.
// MarketMind never sends orders. We use SoDEX endpoints purely as a
// liquidity-and-flow signal layer: spread, depth imbalance, taker bias,
// recent fill velocity, and perps funding feed the cause-effect engine.
//
// Reads are UNAUTHENTICATED on the testnet gateway:
//   spot  base https://testnet-gw.sodex.dev/api/v1/spot
//   perps base https://testnet-gw.sodex.dev/api/v1/perps
//   GET /markets/{symbol}/trades, /markets/{symbol}/orderbook,
//       /markets/{symbol}/klines, perps /markets/mark-prices

const SODEX_SPOT_BASE = process.env.SODEX_SPOT_BASE ?? "https://testnet-gw.sodex.dev/api/v1/spot";
const SODEX_PERPS_BASE = process.env.SODEX_PERPS_BASE ?? "https://testnet-gw.sodex.dev/api/v1/perps";

export type OrderbookLevel = { price: number; size: number };
export type Orderbook = {
  symbol: string;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  spreadBps: number;
  depthImbalance: number;
};

export type SodexTrade = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  price: number;
  size: number;
  ts: number;
};

export type SodexTicker = {
  symbol: string;
  last: number;
  change24h: number;
  volume24h: number;
  takerBuyRatio: number;
};

export type MarkPrice = {
  symbol: string;
  markPrice: number;
  fundingRate: number; // per-interval funding rate (e.g. 8h), decimal
};

// SoDEX reads are unauthenticated, so the client is always "available".
// We keep this for symmetry/feature-flagging; callers can force-mock via env.
export function hasSodexKey(): boolean {
  return process.env.SODEX_DISABLE !== "1";
}

async function request<T>(base: string, path: string): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    // Keep the demo snappy if the testnet gateway is slow/unreachable.
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) {
    throw new Error(`SoDEX ${response.status} on ${path}`);
  }
  return (await response.json()) as T;
}

function unwrap<T>(json: unknown): T {
  // SoDEX responses are sometimes bare, sometimes {data: ...}.
  if (json && typeof json === "object" && "data" in (json as Record<string, unknown>)) {
    return (json as { data: T }).data;
  }
  return json as T;
}

// ---------------------------------------------------------------------------
// Orderbook
// ---------------------------------------------------------------------------

export async function getOrderbook(symbol: string) {
  const json = await request<unknown>(SODEX_SPOT_BASE, `/markets/${symbol}/orderbook`);
  const raw = unwrap<Record<string, unknown>>(json);
  const bids = normalizeLevels(raw.bids ?? raw.b);
  const asks = normalizeLevels(raw.asks ?? raw.a);

  const bidDepth = bids.reduce((s, b) => s + b.size, 0);
  const askDepth = asks.reduce((s, a) => s + a.size, 0);
  const depthImbalance = bidDepth + askDepth > 0 ? round((bidDepth - askDepth) / (bidDepth + askDepth), 3) : 0;
  const bestBid = bids[0]?.price ?? 0;
  const bestAsk = asks[0]?.price ?? 0;
  const mid = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestAsk || bestBid || 0;
  const spreadBps = mid > 0 && bestAsk && bestBid ? round(((bestAsk - bestBid) / mid) * 10_000, 1) : 0;

  const ob: Orderbook = { symbol, bids, asks, spreadBps, depthImbalance };
  return { data: ob };
}

function normalizeLevels(raw: unknown): OrderbookLevel[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((lvl): OrderbookLevel | null => {
      if (Array.isArray(lvl)) {
        return { price: Number(lvl[0]), size: Number(lvl[1]) };
      }
      if (lvl && typeof lvl === "object") {
        const r = lvl as Record<string, unknown>;
        return { price: Number(r.price ?? r.p ?? 0), size: Number(r.size ?? r.qty ?? r.q ?? r.amount ?? 0) };
      }
      return null;
    })
    .filter((l): l is OrderbookLevel => l != null && Number.isFinite(l.price) && Number.isFinite(l.size))
    .slice(0, 20);
}

// ---------------------------------------------------------------------------
// Recent trades — taker side → taker-buy ratio + net flow
// ---------------------------------------------------------------------------

export async function getRecentTrades(symbol: string, limit = 50) {
  const json = await request<unknown>(SODEX_SPOT_BASE, `/markets/${symbol}/trades?limit=${limit}`);
  const rows = unwrap<unknown[]>(json) ?? [];
  const trades: SodexTrade[] = (Array.isArray(rows) ? rows : [])
    .map((row, i): SodexTrade | null => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      // taker side: SoDEX exposes either side or an isBuyerMaker flag.
      let side: "BUY" | "SELL";
      if (r.side != null) {
        side = String(r.side).toUpperCase().startsWith("B") ? "BUY" : "SELL";
      } else if (r.takerSide != null) {
        side = String(r.takerSide).toUpperCase().startsWith("B") ? "BUY" : "SELL";
      } else {
        // isBuyerMaker true → taker is the seller.
        side = r.isBuyerMaker === true ? "SELL" : "BUY";
      }
      const price = Number(r.price ?? r.p ?? 0);
      const size = Number(r.size ?? r.qty ?? r.q ?? r.amount ?? 0);
      const ts = Number(r.ts ?? r.time ?? r.timestamp ?? r.T ?? Date.now());
      if (!Number.isFinite(price) || !Number.isFinite(size)) return null;
      return { id: String(r.id ?? r.tradeId ?? `${ts}_${i}`), symbol, side, price, size, ts };
    })
    .filter((t): t is SodexTrade => t != null);
  return { data: trades };
}

// ---------------------------------------------------------------------------
// Klines (perps or spot)
// ---------------------------------------------------------------------------

export async function getSodexKlines(symbol: string, interval = "1m", limit = 60, market: "spot" | "perps" = "spot") {
  const base = market === "perps" ? SODEX_PERPS_BASE : SODEX_SPOT_BASE;
  const json = await request<unknown>(base, `/markets/${symbol}/klines?interval=${interval}&limit=${limit}`);
  const rows = unwrap<unknown[]>(json) ?? [];
  return { data: Array.isArray(rows) ? rows : [] };
}

// ---------------------------------------------------------------------------
// Perps mark prices → funding rate per symbol
// ---------------------------------------------------------------------------

export async function getMarkPrices() {
  const json = await request<unknown>(SODEX_PERPS_BASE, `/markets/mark-prices`);
  const rows = unwrap<unknown[]>(json) ?? [];
  const data: MarkPrice[] = (Array.isArray(rows) ? rows : [])
    .map((row): MarkPrice | null => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const symbol = String(r.symbol ?? r.market ?? r.s ?? "");
      if (!symbol) return null;
      return {
        symbol,
        markPrice: Number(r.markPrice ?? r.mark_price ?? r.price ?? 0),
        fundingRate: Number(r.fundingRate ?? r.funding_rate ?? r.funding ?? 0),
      };
    })
    .filter((m): m is MarkPrice => m != null);
  return { data };
}

function round(n: number, places = 2) {
  const m = 10 ** places;
  return Math.round(n * m) / m;
}
