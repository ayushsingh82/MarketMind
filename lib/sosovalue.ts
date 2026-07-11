// SoSoValue OpenAPI v1 client (read-only) — verified against the live API.
//
//   base https://openapi.sosovalue.com/openapi/v1 , header x-soso-api-key.
// All endpoints are GET; responses are wrapped `{ code, message, data }` with
// snake_case fields and 24h changes as FRACTIONS (0.0056 = +0.56%). This module
// unwraps + normalizes into the app's typed shapes.
//
// Rate discipline: the Demo plan allows only 10 req/min and 10k calls/MONTH, so
// every call is served from a generous in-memory TTL cache (3-5 min). Callers
// still fall back to lib/mock.ts on any throw, so a dead/limited endpoint never
// breaks the UI. Klines above 1d require a whitelisted key on this plan, so
// getKlines short-circuits to a fallback WITHOUT spending a call.

const SOSO_BASE_URL = "https://openapi.sosovalue.com/openapi/v1";
// Hardcoded Demo key so the app runs live with zero config (no env on Vercel).
const SOSO_API_KEY = "SOSO-ed3a4f77582943bab2b77556662acdb6";

const SOSO_NEWS_PATH = process.env.SOSO_NEWS_PATH ?? "/news";
const SOSO_SECTOR_PATH = process.env.SOSO_SECTOR_PATH ?? "/currencies/sector-spotlight";
const SOSO_MACRO_PATH = process.env.SOSO_MACRO_PATH ?? "/macro/events";
const SOSO_INDICES_PATH = process.env.SOSO_INDICES_PATH ?? "/indices";
const SOSO_ETF_PATH = process.env.SOSO_ETF_PATH ?? "/etfs/summary-history";

// Market board universe (kept small; one snapshot call per symbol, all cached).
const MARKET_UNIVERSE = (process.env.SOSO_UNIVERSE ?? "btc,eth,sol,bnb,xrp,doge")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// Klines interval allowed on the Demo plan ("1d" only). Set SOSO_KLINES_LIVE=1
// with a whitelisted key to enable live intraday candles.
const KLINES_LIVE = process.env.SOSO_KLINES_LIVE === "1";

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

export type Kline = { t: number; o: number; h: number; l: number; c: number; v?: number };

export type IndexConstituent = { currency_id: string; symbol: string; weight: number };
export type IndexInfo = { ticker: string; name?: string; nav?: number; change24h?: number };

export type EtfFlow = {
  symbol: string;
  countryCode?: string;
  date: string;
  totalNetInflow: number; // negative = outflow
  cumNetInflow?: number;
};

export function hasSosoKey(): boolean {
  return Boolean(SOSO_API_KEY);
}

// --- cached GET that unwraps { code, message, data } -------------------------

const cache = new Map<string, { at: number; data: unknown }>();
const DEFAULT_TTL_MS = 180_000; // 3 min — Demo plan is 10k calls/month

async function cachedGet<T>(path: string, ttlMs = DEFAULT_TTL_MS): Promise<T> {
  if (!SOSO_API_KEY) throw new Error("Missing SOSO_API_KEY");
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && now - hit.at < ttlMs) return hit.data as T;

  const response = await fetch(`${SOSO_BASE_URL}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", "x-soso-api-key": SOSO_API_KEY },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`SoSoValue ${response.status} on ${path}`);
  const body = (await response.json()) as { code?: number; message?: string; data?: unknown };
  if (body.code !== undefined && body.code !== 0) {
    throw new Error(`SoSoValue code ${body.code} on ${path}: ${body.message ?? ""}`);
  }
  const data = (body.data ?? body) as T;
  cache.set(path, { at: now, data });
  return data;
}

const pct = (frac: unknown): number => Math.round(Number(frac ?? 0) * 100 * 100) / 100;

// --- currency id resolution (symbol -> currency_id), cached 1h ---------------

let idMap: { at: number; map: Map<string, string> } | null = null;

async function getCurrencyIdMap(): Promise<Map<string, string>> {
  const now = Date.now();
  if (idMap && now - idMap.at < 3_600_000) return idMap.map;
  const rows = await cachedGet<Array<{ currency_id: string; symbol: string }>>("/currencies", 3_600_000);
  const map = new Map<string, string>();
  for (const r of rows) if (r?.symbol) map.set(String(r.symbol).toLowerCase(), String(r.currency_id));
  idMap = { at: now, map };
  return map;
}

// ---------------------------------------------------------------------------
// Market data
// ---------------------------------------------------------------------------

// No arg -> the small market board; a symbol -> just that coin's snapshot.
export async function getMarketSnapshot(symbol?: string): Promise<{ data: MarketSnapshot[] }> {
  const map = await getCurrencyIdMap();
  const symbols = symbol ? [symbol.toLowerCase()] : MARKET_UNIVERSE;
  const out: MarketSnapshot[] = [];
  for (const sym of symbols) {
    const id = map.get(sym);
    if (!id) continue;
    try {
      const s = await cachedGet<{ price?: number; change_pct_24h?: number; turnover_24h?: number; marketcap?: number }>(
        `/currencies/${id}/market-snapshot`,
        180_000,
      );
      out.push({
        symbol: sym.toUpperCase(),
        price: Number(s.price ?? 0),
        change24h: pct(s.change_pct_24h),
        volume24h: s.turnover_24h != null ? Number(s.turnover_24h) : undefined,
        marketCap: s.marketcap != null ? Number(s.marketcap) : undefined,
      });
    } catch {
      // skip a single failed symbol
    }
  }
  if (out.length === 0) throw new Error("SoSoValue market-snapshot returned no symbols");
  return { data: out };
}

// Intraday klines require a whitelisted key on the Demo plan (1d only). To avoid
// burning the monthly quota on guaranteed 403s, short-circuit unless explicitly
// enabled. Callers already fall back to mock series on throw.
export async function getKlines(currencyIdOrSymbol: string, interval = "1m", limit = 240) {
  if (!KLINES_LIVE) {
    throw new Error("klines disabled on Demo plan (set SOSO_KLINES_LIVE=1 with a whitelisted key)");
  }
  const map = await getCurrencyIdMap();
  const id = map.get(currencyIdOrSymbol.toLowerCase()) ?? currencyIdOrSymbol;
  const raw = await cachedGet<unknown[]>(
    `/currencies/${id}/klines?interval=${encodeURIComponent(interval)}&limit=${limit}`,
    180_000,
  );
  return { data: normalizeKlines(raw ?? []) };
}

function normalizeKlines(rows: unknown[]): Kline[] {
  return rows
    .map((row): Kline | null => {
      if (Array.isArray(row)) {
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

export async function getSectorSpotlight(): Promise<{ data: SectorSpotlightItem[] }> {
  const d = await cachedGet<{ sector?: Array<{ name: string; change_pct_24h: number; marketcap_dom?: number }> }>(
    SOSO_SECTOR_PATH,
    180_000,
  );
  const rows = Array.isArray(d.sector) ? d.sector : [];
  const data: SectorSpotlightItem[] = rows.map((s) => ({
    sector: String(s.name),
    change24h: pct(s.change_pct_24h),
    marketCap: s.marketcap_dom != null ? pct(s.marketcap_dom) : undefined,
  }));
  return { data };
}

type RawNews = {
  id?: string | number;
  title?: string;
  author?: string;
  release_time?: string | number;
  source_link?: string;
  original_link?: string;
  matched_currencies?: Array<{ symbol?: string } | string>;
};

function hostOf(u?: string): string | undefined {
  if (!u) return undefined;
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export async function getNews(limit = 10): Promise<{ data: NewsItem[] }> {
  const d = await cachedGet<{ list?: RawNews[] }>(`${SOSO_NEWS_PATH}?page_size=${limit}&language=en`, 120_000);
  const rows = Array.isArray(d.list) ? d.list : [];
  const data: NewsItem[] = rows.slice(0, limit).map((n, i) => ({
    id: String(n.id ?? i),
    title: String(n.title ?? "").trim(),
    source: n.author || hostOf(n.original_link) || hostOf(n.source_link) || "SoSoValue",
    url: n.original_link || n.source_link,
    publishedAt: Number(n.release_time ?? Date.now()),
    symbols: Array.isArray(n.matched_currencies)
      ? n.matched_currencies
          .map((c) => (typeof c === "string" ? c : c?.symbol))
          .filter(Boolean)
          .map((s) => String(s).toUpperCase())
      : undefined,
  }));
  return { data };
}

// Macro calendar: API returns [{ date, events: string[] }]; flatten + classify.
function classifyMacro(title: string): { category: MacroEvent["category"]; importance: MacroEvent["importance"] } {
  const t = title.toLowerCase();
  if (/cpi|ppi|inflation|pce/.test(t)) return { category: "inflation", importance: "high" };
  if (/fomc|rate|fed|interest/.test(t)) return { category: "rate", importance: "high" };
  if (/nonfarm|payroll|unemployment|jobs|jobless|claims/.test(t)) return { category: "jobs", importance: "high" };
  if (/pmi|gdp|retail|sales|housing|home|manufactur/.test(t)) return { category: "other", importance: "medium" };
  if (/earnings/.test(t)) return { category: "earnings", importance: "medium" };
  return { category: "other", importance: "low" };
}

export async function getMacroEvents(): Promise<{ data: MacroEvent[] }> {
  const rows = await cachedGet<Array<{ date?: string; events?: string[] }>>(SOSO_MACRO_PATH, 300_000);
  const data: MacroEvent[] = [];
  for (const day of Array.isArray(rows) ? rows : []) {
    const ts = day.date ? Date.parse(`${day.date}T13:30:00Z`) : Date.now();
    for (const [i, name] of (day.events ?? []).entries()) {
      const { category, importance } = classifyMacro(String(name));
      data.push({ id: `${day.date}-${i}`, title: String(name), category, scheduledAt: ts, importance });
    }
  }
  return { data };
}

// ---------------------------------------------------------------------------
// Indices (SSI baskets)
// ---------------------------------------------------------------------------

// /indices returns a bare ticker string array; normalize to IndexInfo[].
export async function getIndices(): Promise<{ data: IndexInfo[] }> {
  const raw = await cachedGet<unknown>(SOSO_INDICES_PATH, 3_600_000);
  const list = Array.isArray(raw) ? raw : [];
  const data: IndexInfo[] = list.map((x) =>
    typeof x === "string"
      ? { ticker: x }
      : { ticker: String((x as Record<string, unknown>).ticker ?? (x as Record<string, unknown>).index ?? "") },
  );
  return { data: data.filter((d) => d.ticker) };
}

export async function getIndexConstituents(ticker: string): Promise<{ data: IndexConstituent[] }> {
  const rows = await cachedGet<Array<{ currency_id?: string; symbol?: string; weight?: number }>>(
    `${SOSO_INDICES_PATH}/${ticker}/constituents`,
    600_000,
  );
  const data: IndexConstituent[] = (Array.isArray(rows) ? rows : []).map((r) => ({
    currency_id: String(r.currency_id ?? ""),
    symbol: String(r.symbol ?? ""),
    weight: Number(r.weight ?? 0),
  }));
  return { data };
}

export async function getIndexMarketSnapshot(ticker?: string): Promise<{ data: unknown }> {
  const path = ticker ? `${SOSO_INDICES_PATH}/${ticker}/market-snapshot` : SOSO_INDICES_PATH;
  const d = await cachedGet<unknown>(path, 180_000);
  return { data: d };
}

// ---------------------------------------------------------------------------
// ETF flows — /etfs/summary-history (GET; symbol + country_code required)
// ---------------------------------------------------------------------------

// Accepts either a coin symbol ("BTC") or the app's legacy "us-btc-spot" form;
// normalizes to the API's (symbol=BTC, country_code=US) params.
function parseEtfSymbol(input: string): { coin: string; country: string } {
  const parts = input.toLowerCase().split("-").filter(Boolean);
  if (parts.length >= 2 && /^[a-z]{2}$/.test(parts[0])) {
    return { coin: parts[1].toUpperCase(), country: parts[0].toUpperCase() };
  }
  return { coin: input.toUpperCase(), country: "US" };
}

export async function getEtfFlows(symbol = "BTC", days = 14): Promise<{ data: EtfFlow[] }> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const { coin, country } = parseEtfSymbol(symbol);
  const qs = new URLSearchParams({
    symbol: coin,
    country_code: country,
    start_date: fmt(start),
    end_date: fmt(end),
    limit: String(Math.min(300, days + 5)),
  });
  const rows = await cachedGet<Array<Record<string, unknown>>>(`${SOSO_ETF_PATH}?${qs.toString()}`, 300_000);
  const data: EtfFlow[] = (Array.isArray(rows) ? rows : [])
    .map((r) => ({
      symbol: coin,
      countryCode: country,
      date: String(r.date ?? ""),
      totalNetInflow: Number(r.total_net_inflow ?? 0),
      cumNetInflow: r.cum_net_inflow != null ? Number(r.cum_net_inflow) : undefined,
    }))
    .reverse(); // newest-first from API -> oldest-first for charts
  return { data };
}
