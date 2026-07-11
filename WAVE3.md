# Wave 3 — SHIPPED so far

**Ask Market is now LIVE by default — the Wave 2 "LLM built but never run
end-to-end" caveat is closed.** `lib/llm.ts` gained a second provider: an
OpenAI-compatible endpoint (a self-hosted vLLM server running
`Qwen/Qwen3-VL-8B-Instruct` behind a RunPod proxy) that needs no key, so
Ask Market reasons with a real grounded model out of the box. Anthropic Claude
is still used automatically when `ANTHROPIC_API_KEY` is set (with prompt
caching). Everything is env-overridable (`OPENAI_BASE_URL` / `OPENAI_MODEL` /
`OPENAI_API_KEY`, or the `AI_*` aliases). On any endpoint error the engine falls
back to the deterministic templated analysis, so a dead pod never hard-fails.

- **NEW — AI Market Brief.** `/api/marketmind/brief` (via
  `runMarketMindBrief()`) generates a live 2-3 sentence tape read — what's
  driving crypto, the clearest cross-source signal/disagreement, one thing to
  watch — grounded in the same news / sector / macro / market context. Cached
  server-side (~90s) and surfaced as a full-width card on `/dashboard`. Verified
  end-to-end against the live model.
- **Provider-aware health.** `/api/marketmind/health` reports the active LLM
  provider label.

Verified live: Ask Market returns `source: vLLM/Qwen/Qwen3-VL-8B-Instruct
(grounded)` structured JSON; the brief is grounded in the current feeds.
Ephemeral-endpoint caveat: RunPod proxy URLs rotate — set `OPENAI_BASE_URL`
(or an Anthropic key) for a permanent deployment.

---

# Wave 3 — Plan (remaining, not built)

Wave 2 made the intelligence real but stateless and single-shot. Wave 3 makes it
*persistent, personalized, and temporal* — the engine should remember, adapt to a
user, and show how its read changed over time. Listed roughly in leverage order.

## 1. Persistence + true per-user personalization
The watchlist currently drives nothing — insights/alerts are mock and identical
for everyone.
- Add a persistence layer (SQLite/Postgres or KV) for watchlists, saved Ask
  threads, and signal history.
- Make the watchlist the *input* to the engine: contradiction checks, narrative
  ranking, and Ask grounding should be scoped/weighted to the user's symbols and
  SSI/MMX exposure. Personal Insights become genuinely personal (blended
  watchlist beta, per-symbol event risk).
- Per-user Ask sessions with conversation memory (multi-turn), reusing the
  prompt-cache prefix across turns.

## 2. Regime-classification confidence trend over time
- Persist the engine's regime/confidence snapshots on a schedule and chart the
  **confidence trend** (and regime transitions) over hours/days, instead of a
  single instantaneous read. Lets the user see conviction building or decaying.
- Back-test the regime classifier against realized forward returns to calibrate
  the confidence number rather than asserting it.

## 3. Deeper on-chain SSI READ flow on Base
- Read SSI mint/redeem activity and on-chain NAV from Base (read-only, via a
  public RPC or indexer) to compare the engine's computed MMX NAV and the
  reference SSI baskets against on-chain ground truth. Still no minting (gated).

## 4. More contradiction sources
- Spot vs perps basis; open-interest delta vs price; stablecoin supply trend vs
  risk-on breadth; cross-exchange funding dispersion; news velocity spike vs flat
  taker flow. Add severity calibration from historical hit-rate of each check.

## 5. Impact-decay curves (visualized)
- Wave 2 computes a scalar decay half-life. Wave 3 renders the **full post-event
  price path** per headline as a decay curve, and clusters headlines by measured
  impact profile (fast-fade vs persistent) to make the "which news actually
  moves price" claim visual.

## 6. Live SoDEX l2Book WebSocket orderbook + tape
- Replace the polled REST orderbook/trades with the `wss://testnet-gw.sodex.dev/ws`
  `l2Book` channel (top-20, <0.5s) for a live-updating depth ladder and tape on
  the SoDEX Flow page, with reconnect/backfill.

## 7. Mobile-responsive pass
- The current grid is desktop-first (`md:col-span-*`, hidden sidebar on small
  screens). Add a mobile layout: collapsible nav, single-column panel stacking,
  touch-friendly charts.

## Deferred from Wave 2
- **End-to-end LLM verification under load** — the Ask LLM path was built and
  typechecked but not run end-to-end (no `ANTHROPIC_API_KEY` in the build
  environment). Wave 3 should add a smoke-test with a live key, measure cache hit
  rate via `usage.cache_read_input_tokens`, and tune `max_tokens`/effort.
- **Live SoDEX trades/orderbook** — the testnet gateway returned live funding but
  empty trades/books during Wave 2 testing; the route falls back to mock
  microstructure. Confirm against a populated market (or the WebSocket feed) and
  remove the fallback once consistently live.
- **`drift7d` for SSI baskets** — reported as 0 in Wave 2 (a single snapshot
  can't measure 7-day weight drift). Compute it from a persisted weight history.
- **Per-headline citations in the LLM evidence** linking back to source URLs.
