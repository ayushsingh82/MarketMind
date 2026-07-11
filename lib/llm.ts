// Real LLM layer for "Ask Market" + the AI Market Brief.
//
// Single hardcoded provider: the self-hosted vLLM server running
// Qwen/Qwen3-VL-8B-Instruct (the endpoint provided for this build). No env, no
// OpenAI, no Anthropic — this endpoint only. Ask Market reasons with a real,
// grounded model out of the box. On any endpoint error, marketmind.ts falls back
// to the deterministic templated analysis so a dead endpoint never hard-fails.

import type { AskResponse } from "./types";

const OAI_BASE_URL = "https://j197d3s4gy3ijy-8002.proxy.runpod.net/v1";
const OAI_MODEL = "Qwen/Qwen3-VL-8B-Instruct";
// The vLLM endpoint ignores the key; any non-empty value is fine.
const OAI_API_KEY = "runpod-local";

/** The LLM is always available (hardcoded endpoint). */
export function hasLlmKey(): boolean {
  return true;
}

export function llmProviderLabel(): string {
  return `vLLM · ${OAI_MODEL}`;
}

const SYSTEM_PROMPT = `You are MarketMind, a read-only crypto market intelligence engine.

Your job: explain WHY markets are moving, grounded ONLY in the structured data provided to you in the user turn. You never place trades and never give financial advice framed as a recommendation — you produce analysis a desk analyst would write, with explicit citations to the source data.

Rules:
- Ground every claim in the provided NEWS / SECTORS / MACRO / MARKET data. Do not invent prices, funding rates, flows, or events that are not in the context.
- If the data is thin or absent for the question, say so plainly and lower your confidence — do not fabricate.
- "citations" must reference real items from the provided news list (use their id + title + source).
- "contradictions" should surface genuine cross-source disagreement visible in the data (e.g. bullish headlines vs. negative sector breadth), not generic caveats.
- "confidence" is a float 0..1 reflecting how well the data supports the thesis.
- Keep prose tight and concrete. No hedging filler.

Respond with ONLY a JSON object, no prose around it, matching exactly this TypeScript shape:
{
  "thesis": string,                                   // 1-3 sentences, the core explanation
  "causes": string[],                                 // 2-4 concrete drivers, each grounded
  "evidence": { "label": string, "value": string, "source": string }[],  // 2-4 items pulled from the data
  "impact": string,                                   // what it means going forward, conditional
  "contradictions": string[],                         // 0-3 cross-source disagreements; [] if none
  "confidence": number,                               // 0..1
  "suggestions": string[],                            // 2-3 process notes (NOT orders)
  "citations": { "id": string, "title": string, "source": string }[]  // from the news list
}`;

export type LlmContext = {
  query: string;
  news: { id: string; title: string; source: string; sentiment?: string; conviction?: number; symbols?: string[]; publishedAt?: number }[];
  sectors: { sector: string; change24h: number; marketCap?: number }[];
  macro: { title: string; scheduledAt?: number; importance?: string }[];
  market: { symbol: string; price: number; change24h: number }[];
  etfFlows?: { symbol: string; date: string; totalNetInflow: number }[];
};

export type LlmResult = {
  analysis: AskResponse;
  source: string;
  usage?: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number };
};

function buildGroundingBlock(ctx: LlmContext): string {
  return [
    "GROUNDING DATA (use only this):",
    "",
    "## NEWS",
    JSON.stringify(ctx.news, null, 0),
    "",
    "## SECTORS (24h)",
    JSON.stringify(ctx.sectors, null, 0),
    "",
    "## MACRO CALENDAR",
    JSON.stringify(ctx.macro, null, 0),
    "",
    "## MARKET SNAPSHOT",
    JSON.stringify(ctx.market, null, 0),
    ...(ctx.etfFlows && ctx.etfFlows.length
      ? ["", "## ETF FLOWS (net, USD; negative = outflow)", JSON.stringify(ctx.etfFlows, null, 0)]
      : []),
  ].join("\n");
}

// Low-level chat call against the vLLM endpoint. Returns raw assistant text.
async function chat(messages: { role: string; content: string }[], maxTokens: number): Promise<{ text: string; usage: { prompt_tokens?: number; completion_tokens?: number } }> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(`${OAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OAI_API_KEY}` },
      body: JSON.stringify({ model: OAI_MODEL, temperature: 0.4, max_tokens: maxTokens, messages }),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) throw new Error(`vLLM ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return { text: json.choices?.[0]?.message?.content ?? "", usage: json.usage ?? {} };
}

export async function runMarketMindLLM(ctx: LlmContext): Promise<LlmResult> {
  const grounding = buildGroundingBlock(ctx);
  const { text, usage } = await chat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `${grounding}\n\nQUESTION: ${ctx.query}\n\nReturn the JSON object now.` },
    ],
    1600,
  );
  const parsed = parseJsonObject(text);
  const analysis = coerceAnalysis(parsed, ctx);
  return {
    analysis,
    source: `vLLM/${OAI_MODEL} (grounded)`,
    usage: {
      inputTokens: usage.prompt_tokens ?? 0,
      outputTokens: usage.completion_tokens ?? 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
  };
}

// Short plain-text tape brief grounded in the same context (dashboard header).
const BRIEF_SYSTEM = `You are MarketMind, a read-only crypto desk analyst. Ground every claim ONLY in the data provided. Never give trade recommendations. Write plain text, no headers, no bullet characters.`;

export async function generateBrief(ctx: LlmContext): Promise<{ text: string; live: boolean; source: string }> {
  const grounding = buildGroundingBlock(ctx);
  const user = `${grounding}\n\nWrite a 2-3 sentence market tape brief: what is driving crypto right now, the single clearest cross-source signal or disagreement in the data, and one thing to watch next.`;
  try {
    const { text } = await chat(
      [
        { role: "system", content: BRIEF_SYSTEM },
        { role: "user", content: user },
      ],
      220,
    );
    const trimmed = text.trim();
    if (!trimmed) return { text: "", live: false, source: "" };
    return { text: trimmed, live: true, source: `vLLM/${OAI_MODEL} (brief)` };
  } catch {
    return { text: "", live: false, source: "" };
  }
}

// Extract the first balanced JSON object from the model text.
function parseJsonObject(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("LLM did not return a JSON object");
  }
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

// Defensively coerce the model output into a valid AskResponse, backfilling
// citations/sources from the grounding context so the UI never breaks.
function coerceAnalysis(raw: Record<string, unknown>, ctx: LlmContext): AskResponse {
  const asStrArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(String).filter(Boolean) : [];
  const evidence = Array.isArray(raw.evidence)
    ? (raw.evidence as Record<string, unknown>[]).map((e) => ({
        label: String(e.label ?? "EVIDENCE"),
        value: String(e.value ?? ""),
        source: String(e.source ?? "SoSoValue"),
      }))
    : [];
  const citations = Array.isArray(raw.citations)
    ? (raw.citations as Record<string, unknown>[]).map((c) => ({
        id: String(c.id ?? ""),
        title: String(c.title ?? ""),
        source: String(c.source ?? "SoSoValue"),
      }))
    : ctx.news.slice(0, 3).map((n) => ({ id: n.id, title: n.title, source: n.source }));

  let confidence = Number(raw.confidence);
  if (!Number.isFinite(confidence)) confidence = 0.6;
  if (confidence > 1) confidence = confidence / 100;
  confidence = Math.max(0.05, Math.min(0.98, confidence));

  return {
    thesis: String(raw.thesis ?? "Insufficient grounded data to form a confident thesis."),
    causes: asStrArr(raw.causes),
    evidence: evidence.length ? evidence : ctx.news.slice(0, 3).map((n) => ({ label: (n.sentiment ?? "news").toUpperCase(), value: n.title, source: n.source })),
    impact: String(raw.impact ?? ""),
    contradictions: asStrArr(raw.contradictions),
    confidence,
    suggestions: asStrArr(raw.suggestions),
    sources: {
      newsCount: ctx.news.length,
      marketPoints: ctx.market.length,
      macroEvents: ctx.macro.length,
    },
    citations,
  };
}
