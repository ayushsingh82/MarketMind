// SoDEX read-only intelligence client.
// MarketMind never sends orders. We use SoDEX endpoints purely as a
// liquidity-and-flow signal layer: spread, depth imbalance, taker bias,
// and recent fill velocity feed the cause-effect engine.

const SODEX_BASE_URL = process.env.SODEX_BASE_URL ?? "https://testnet-api.sodex.com";
const SODEX_API_KEY = process.env.SODEX_API_KEY;

const SODEX_ORDERBOOK_PATH = process.env.SODEX_ORDERBOOK_PATH ?? "/v1/market/orderbook";
const SODEX_TRADES_PATH = process.env.SODEX_TRADES_PATH ?? "/v1/market/trades";
const SODEX_TICKER_PATH = process.env.SODEX_TICKER_PATH ?? "/v1/market/ticker";

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

export function hasSodexKey(): boolean {
  return Boolean(SODEX_API_KEY);
}

async function request<T>(path: string): Promise<T> {
  if (!SODEX_API_KEY) {
    throw new Error("Missing SODEX_API_KEY");
  }
  const response = await fetch(`${SODEX_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SODEX_API_KEY}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`SoDEX ${response.status} on ${path}`);
  }
  return (await response.json()) as T;
}

export async function getOrderbook(symbol: string) {
  return request<{ data: Orderbook }>(`${SODEX_ORDERBOOK_PATH}?symbol=${symbol}`);
}

export async function getRecentTrades(symbol: string) {
  return request<{ data: SodexTrade[] }>(`${SODEX_TRADES_PATH}?symbol=${symbol}&limit=30`);
}

export async function getTicker(symbol: string) {
  return request<{ data: SodexTicker }>(`${SODEX_TICKER_PATH}?symbol=${symbol}`);
}
