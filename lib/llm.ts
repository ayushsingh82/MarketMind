// Real LLM layer for "Ask Market".
//
// Two providers, one signature:
//   1. OpenAI-compatible endpoint (DEFAULT) — a self-hosted vLLM server running
//      Qwen/Qwen3-VL-8B-Instruct behind a RunPod proxy. No key required, so the
//      Ask Market path reasons with a REAL model out of the box (Wave 3 closes
//      the Wave 2 "LLM built but never run end-to-end" caveat). Env-overridable
//      because RunPod proxy URLs are ephemeral.
//   2. Anthropic Claude — used only when ANTHROPIC_API_KEY is set, with prompt
//      caching on the stable system + grounding prefix.
//
// Both return a STRUCTURED JSON object matching the AskResponse shape. On any
// error marketmind.ts falls back to the deterministic templated analysis, so a
// dead endpoint never hard-fails the app.

import Anthropic from "@anthropic-ai/sdk";
import type { AskResponse } from "./types";

const CLAUDE_MODEL = "claude-sonnet-4-6";

// OpenAI-compatible (vLLM/RunPod) defaults — the live, zero-config path.
const DEFAULT_OAI_BASE_URL = "https://j197d3s4gy3ijy-8002.proxy.runpod.net/v1";
const DEFAULT_OAI_MODEL = "Qwen/Qwen3-VL-8B-Instruct";

const OAI_BASE_URL = process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL || DEFAULT_OAI_BASE_URL;
const OAI_MODEL = process.env.OPENAI_MODEL || process.env.AI_MODEL || DEFAULT_OAI_MODEL;
// The vLLM endpoint ignores the key; keep a non-empty sentinel.
const OAI_API_KEY = process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "runpod-local";

function useClaude(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Is any LLM available? With the Wave 3 baked-in OpenAI-compatible default this
 * is always true — the Ask Market path is live by default (Claude only when a
 * key is present). Liveness of the actual endpoint is handled by the caller's
 * try/catch, which falls back to the heuristic on error.
 */
export function hasLlmKey(): boolean {
  return true;
}

/** Human-readable label for the active provider, surfaced in /health + source tags. */
export function llmProviderLabel(): string {
  return useClaude() ? `Anthropic · ${CLAUDE_MODEL}` : `vLLM · ${OAI_MODEL}`;
}

// Stable system prompt — frozen so it caches across requests (Claude path). No
// timestamps, no per-request IDs here (those go in the user turn).
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

// Build the large grounding block shared by both providers.
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

export async function runMarketMindLLM(ctx: LlmContext): Promise<LlmResult> {
  return useClaude() ? runClaude(ctx) : runOpenAICompatible(ctx);
}

// --- OpenAI-compatible provider (vLLM / RunPod) — the default live path -------

async function runOpenAICompatible(ctx: LlmContext): Promise<LlmResult> {
  const groundingBlock = buildGroundingBlock(ctx);

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(`${OAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OAI_MODEL,
        temperature: 0.4,
        max_tokens: 1600,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `${groundingBlock}\n\nQUESTION: ${ctx.query}\n\nReturn the JSON object now.` },
        ],
      }),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`vLLM ${res.status}: ${(await res.text()).slice(0, 120)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  const parsed = parseJsonObject(text);
  const analysis = coerceAnalysis(parsed, ctx);

  return {
    analysis,
    source: `vLLM/${OAI_MODEL} (grounded)`,
    usage: {
      inputTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
  };
}

// --- Anthropic Claude provider (opt-in via ANTHROPIC_API_KEY) -----------------

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

async function runClaude(ctx: LlmContext): Promise<LlmResult> {
  const anthropic = getClient();
  const groundingBlock = buildGroundingBlock(ctx);

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
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
    source: `Anthropic/${CLAUDE_MODEL} (grounded, cached)`,
    usage: {
      inputTokens: u.input_tokens,
      outputTokens: u.output_tokens,
      cacheReadTokens: u.cache_read_input_tokens ?? 0,
      cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
    },
  };
}

// Wave 3 "AI Market Brief": a short plain-text tape note grounded in the same
// context, for the dashboard header. Non-JSON, capped tokens. Returns live=false
// (and empty text) on any error so the caller can fall back to a heuristic.
const BRIEF_SYSTEM = `You are MarketMind, a read-only crypto desk analyst. Ground every claim ONLY in the data provided. Never give trade recommendations. Write plain text, no headers, no bullet characters.`;

export async function generateBrief(ctx: LlmContext): Promise<{ text: string; live: boolean; source: string }> {
  const grounding = buildGroundingBlock(ctx);
  const user = `${grounding}\n\nWrite a 2-3 sentence market tape brief: what is driving crypto right now, the single clearest cross-source signal or disagreement in the data, and one thing to watch next.`;
  try {
    if (useClaude()) {
      const anthropic = getClient();
      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 220,
        system: BRIEF_SYSTEM,
        messages: [{ role: "user", content: user }],
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      if (!text) return { text: "", live: false, source: "" };
      return { text, live: true, source: `Anthropic/${CLAUDE_MODEL} (brief)` };
    }
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 30_000);
    let res: Response;
    try {
      res = await fetch(`${OAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OAI_API_KEY}` },
        body: JSON.stringify({
          model: OAI_MODEL,
          temperature: 0.5,
          max_tokens: 220,
          messages: [
            { role: "system", content: BRIEF_SYSTEM },
            { role: "user", content: user },
          ],
        }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) return { text: "", live: false, source: "" };
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = (json.choices?.[0]?.message?.content ?? "").trim();
    if (!text) return { text: "", live: false, source: "" };
    return { text, live: true, source: `vLLM/${OAI_MODEL} (brief)` };
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
