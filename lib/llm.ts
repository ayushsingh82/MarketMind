// Real LLM layer for "Ask Market".
//
// When ANTHROPIC_API_KEY is set, runMarketMindLLM() makes a single grounded
// Claude call (model claude-sonnet-4-6) that takes the live news / sector /
// macro / market JSON as context and returns a STRUCTURED JSON object matching
// the AskResponse shape. Prompt caching (cache_control) is applied to the
// stable system prompt + the large grounding block so repeated questions in a
// session reuse the cached prefix.
//
// When no key is set, this module is inert — marketmind.ts falls back to the
// deterministic templated analysis.

import Anthropic from "@anthropic-ai/sdk";
import type { AskResponse } from "./types";

const MODEL = "claude-sonnet-4-6";

export function hasLlmKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Stable system prompt — frozen so it caches across requests. No timestamps,
// no per-request IDs here (those go in the user turn).
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

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export async function runMarketMindLLM(ctx: LlmContext): Promise<LlmResult> {
  const anthropic = getClient();

  // Large grounding block — cached. Everything stable for the session sits
  // before the (volatile) question, which goes in its own block with no marker.
  const groundingBlock = [
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

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1600,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: groundingBlock, cache_control: { type: "ephemeral" } },
          { type: "text", text: `QUESTION: ${ctx.query}\n\nReturn the JSON object now.` },
        ],
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = parseJsonObject(text);
  const analysis = coerceAnalysis(parsed, ctx);

  const u = response.usage;
  return {
    analysis,
    source: "Anthropic/claude-sonnet-4-6 (grounded, cached)",
    usage: {
      inputTokens: u.input_tokens,
      outputTokens: u.output_tokens,
      cacheReadTokens: u.cache_read_input_tokens ?? 0,
      cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
    },
  };
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
