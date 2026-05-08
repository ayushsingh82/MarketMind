// MarketMind domain models — intelligence layer (no execution).
// MarketMind reads the market like an analyst would and outputs structured
// reasoning: cause-effect chains, contradiction flags, narrative momentum,
// confidence-scored insights. Nothing here trades.

export type IntelligenceSummary = {
  regime: "Risk-On" | "Risk-Off" | "Mixed" | "Defensive";
  signalConfidence: number; // 0–100
  macroRisk: "Low" | "Moderate" | "Elevated" | "High";
  newsVelocity: "Low" | "Normal" | "High" | "Surge";
  contradictionCount: number;
  narrativesTracked: number;
  updatedAt: number;
  alpha24h: number; // explanatory delta vs. consensus narrative
  topNarrative: string;
};

export type SeriesPoint = {
  t: string;
  ts: number;
  btc: number;
  eth: number;
  index: number;
  ai: number;
  sentiment: number; // 0–100 bull–bear balance
};

export type SentimentPoint = {
  t: string;
  ts: number;
  bull: number;
  bear: number;
  neutral: number;
  net: number;
};

export type NewsImpact = {
  id: string;
  title: string;
  source: string;
  publishedAt: number;
  sentiment: "bullish" | "bearish" | "neutral";
  conviction: number; // 0–100
  symbols: string[];
  // measured cause-effect: how price reacted in the window after the headline
  priceImpactPct: number;
  reactionWindowMin: number;
  decayHalfLifeMin: number;
  classification:
    | "macro"
    | "flow"
    | "regulatory"
    | "tech"
    | "narrative"
    | "earnings"
    | "other";
  aiSummary: string;
};

export type Contradiction = {
  id: string;
  title: string;
  signalA: { label: string; value: string; source: string };
  signalB: { label: string; value: string; source: string };
  severity: "low" | "medium" | "high";
  confidence: number;
  resolution: string;
  detectedAt: number;
};

export type NarrativeMomentum = {
  narrative: string;
  velocity: number; // 0–100
  breadth: number; // 0–100 — how broadly it has spread
  persistence: number; // 0–100 — how long it has held
  topSymbols: string[];
  priceProxy: number; // 24h proxy basket return %
  state: "emerging" | "accelerating" | "peaking" | "fading";
};

export type AssetDeepDive = {
  symbol: string;
  price: number;
  change24h: number;
  drivers: { label: string; weight: number; direction: "+" | "-" | "=" }[];
  supportingNews: string[];
  related: { symbol: string; corr: number }[];
  aiNarrative: string;
  candles: { t: string; o: number; h: number; l: number; c: number }[];
  beta: number; // beta to BTC
  zscore: number; // 30-day return z-score
};

export type WatchlistItem = {
  symbol: string;
  thesis: string;
  beta: number;
  exposureNote: string;
  priceChange24h: number;
  riskTone: "calm" | "watch" | "alert";
};

export type PersonalInsight = {
  id: string;
  symbol?: string;
  title: string;
  body: string;
  confidence: number;
  evidence: string[];
  generatedAt: number;
};

export type AskResponse = {
  thesis: string;
  evidence: { label: string; value: string; source: string }[];
  contradictions: string[];
  causes: string[];
  impact: string;
  confidence: number;
  suggestions: string[];
  sources: {
    newsCount: number;
    marketPoints: number;
    macroEvents: number;
  };
  citations: { id: string; title: string; source: string }[];
};

export type AlertItem = {
  id: string;
  category: "macro" | "sector" | "asset" | "narrative" | "risk";
  message: string;
  severity: "info" | "watch" | "warn" | "critical";
  ts: number;
};

export type ApiEnvelope<T> =
  | {
      ok: true;
      data: T;
      source: string;
      generatedAt: number;
    }
  | {
      ok: false;
      error: string;
      generatedAt: number;
    };
