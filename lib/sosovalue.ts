// SoSoValue OpenAPI client (read-only).
//
// Endpoint paths follow the verified SoSoValue OpenAPI v1 reference:
//   base https://openapi.sosovalue.com/openapi/v1 , header x-soso-api-key.
// Override-able via env so the demo can be repointed without code changes.
//
// Every function throws when no key is set; callers fall back to lib/mock.ts.
// Rate budget: 20 req/min, 100k/month — callers cache/poll gently.

const SOSO_BASE_URL = process.env.SOSO_BASE_URL ?? "https://openapi.sosovalue.com/openapi/v1";
const SOSO_API_KEY = process.env.SOSO_API_KEY;

// Endpoint paths (override-able for resilience to spec drift).
const SOSO_NEWS_PATH = process.env.SOSO_NEWS_PATH ?? "/news";
const SOSO_SECTOR_PATH = process.env.SOSO_SECTOR_PATH ?? "/currencies/sector-spotlight";
const SOSO_MACRO_PATH = process.env.SOSO_MACRO_PATH ?? "/macro/events";
const SOSO_INDICES_PATH = process.env.SOSO_INDICES_PATH ?? "/indices";
const SOSO_ETF_PATH = process.env.SOSO_ETF_PATH ?? "/etfs/summary-history";

export type MarketSnapshot = {
  symbol: string;
  price: number;
  change24h: number;
  volume24h?: number;
  marketCap?: number;
};

export type SectorSpotlightItem = {
  sector: string;
  change24h: number;
  marketCap?: number;
  topGainer?: string;
  topGainerChange?: number;
  topLoser?: string;
  topLoserChange?: number;
};

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  url?: string;
  publishedAt: number;
  sentiment?: "bullish" | "bearish" | "neutral";
  conviction?: number;
  symbols?: string[];
  // raw engagement (used to derive sentiment/conviction — the API has no native sentiment field)
  engagement?: { impression?: number; like?: number; reply?: number; retweet?: number };
};

export type MacroEvent = {
  id: string;
  title: string;
  category: "rate" | "inflation" | "jobs" | "geopolitical" | "earnings" | "other";
  scheduledAt: number;
  surprise?: number;
  importance?: "high" | "medium" | "low";
};

// OHLC candle (klines). t = epoch ms of bar open.
export type Kline = { t: number; o: number; h: number; l: number; c: number; v?: number };

// /indices and /indices/{t}/constituents
export type IndexConstituent = { currency_id: string; symbol: string; weight: number };
export type IndexInfo = { ticker: string; name?: string; nav?: number; change24h?: number };

// /etfs/summary-history
export type EtfFlow = {
  symbol: string;
  countryCode?: string;
  date: string;
  totalNetInflow: number; // negative = outflow
  cumNetInflow?: number;
};

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
};

export function hasSosoKey(): boolean {
  return Boolean(SOSO_API_KEY);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!SOSO_API_KEY) {
    throw new Error("Missing SOSO_API_KEY");
  }

  const response = await fetch(`${SOSO_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "x-soso-api-key": SOSO_API_KEY,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`SoSoValue ${response.status} on ${path}`);
  }

  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Market data
// ---------------------------------------------------------------------------

// Per-currency snapshot. The reference exposes /currencies/{id}/market-snapshot;
// the default id ("ALL") returns the full board where supported. Callers only
// rely on .data being an array, so a single-id response is unwrapped to [snapshot].
export async function getMarketSnapshot(currencyId = "ALL") {
  const raw = await request<{ data: MarketSnapshot[] | MarketSnapshot }>(
    `/currencies/${currencyId}/market-snapshot`,
  );
  const data = Array.isArray(raw.data) ? raw.data : raw.data ? [raw.data] : [];
  return { data };
}

// OHLC candles for a currency. interval/limit are passed through as query params.
export async function getKlines(currencyId: string, interval = "1m", limit = 240) {
  const raw = await request<{ data: unknown[] }>(
    `/currencies/${currencyId}/klines?interval=${encodeURIComponent(interval)}&limit=${limit}`,
  );
  const data = normalizeKlines(raw.data ?? []);
  return { data };
}

// Klines come back in a few shapes across deployments; normalize to {t,o,h,l,c}.
function normalizeKlines(rows: unknown[]): Kline[] {
  return rows
    .map((row): Kline | null => {
      if (Array.isArray(row)) {
        // [t, o, h, l, c, v?]
        const [t, o, h, l, c, v] = row as number[];
        return { t: Number(t), o: Number(o), h: Number(h), l: Number(l), c: Number(c), v: v != null ? Number(v) : undefined };
      }
      if (row && typeof row === "object") {
        const r = row as Record<string, unknown>;
        const t = Number(r.t ?? r.time ?? r.timestamp ?? r.openTime ?? 0);
        const o = Number(r.o ?? r.open ?? 0);
        const h = Number(r.h ?? r.high ?? 0);
        const l = Number(r.l ?? r.low ?? 0);
        const c = Number(r.c ?? r.close ?? 0);
        const v = r.v ?? r.volume;
        if (!Number.isFinite(c)) return null;
        return { t, o, h, l, c, v: v != null ? Number(v) : undefined };
      }
      return null;
    })
    .filter((k): k is Kline => k != null && Number.isFinite(k.c));
}

export async function getSectorSpotlight() {
  const raw = await request<{ data?: { sectors?: SectorSpotlightItem[] } | SectorSpotlightItem[] }>(
    SOSO_SECTOR_PATH,
  );
  // The reference nests sectors under data.sectors; tolerate a flat array too.
  const d = raw.data;
  const sectors = Array.isArray(d) ? d : (d?.sectors ?? []);
  return { data: sectors };
}

export async function getNews(limit = 10) {
  return request<{ data: NewsItem[] }>(`${SOSO_NEWS_PATH}?limit=${limit}`);
}

export async function getMacroEvents() {
  return request<{ data: MacroEvent[] }>(SOSO_MACRO_PATH);
}

// ---------------------------------------------------------------------------
// Indices (SSI baskets) — reference + comparison surfaces for MarketMind Index
// ---------------------------------------------------------------------------

export async function getIndices() {
  return request<{ data: IndexInfo[] }>(SOSO_INDICES_PATH);
}

export async function getIndexConstituents(ticker: string) {
  return request<{ data: IndexConstituent[] }>(`${SOSO_INDICES_PATH}/${ticker}/constituents`);
}

export async function getIndexMarketSnapshot(ticker?: string) {
  // With a ticker → that index's snapshot; without → the indices board.
  const path = ticker ? `${SOSO_INDICES_PATH}/${ticker}/market-snapshot` : SOSO_INDICES_PATH;
  return request<{ data: unknown }>(path);
}

// ---------------------------------------------------------------------------
// ETF flows — /etfs/summary-history
// ---------------------------------------------------------------------------

// symbol e.g. "us-btc-spot"; negative total_net_inflow = outflow.
export async function getEtfFlows(symbol = "us-btc-spot", days = 14) {
  const raw = await request<{ data: Record<string, unknown>[] }>(
    `${SOSO_ETF_PATH}?symbol=${encodeURIComponent(symbol)}&days=${days}`,
  );
  const data: EtfFlow[] = (raw.data ?? []).map((r) => ({
    symbol: String(r.symbol ?? symbol),
    countryCode: r.country_code != null ? String(r.country_code) : undefined,
    date: String(r.date ?? ""),
    totalNetInflow: Number(r.total_net_inflow ?? 0),
    cumNetInflow: r.cum_net_inflow != null ? Number(r.cum_net_inflow) : undefined,
  }));
  return { data };
}
