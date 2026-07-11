# Wave 3 — SHIPPED (changelog)

This wave took MarketMind from a mock-data, never-run-end-to-end prototype to a
**live intelligence engine**: real SoSoValue feeds explained by a real AI model,
running with zero configuration.

## 1. Live SoSoValue API integration (was mock-by-default)
`lib/sosovalue.ts` was rewritten against the **verified** SoSoValue OpenAPI v1,
normalizing the live `{ code, message, data }` snake_case responses (24h change
is a fraction → converted to %). Endpoints fixed to the real spec:
- `/currencies/sector-spotlight` (`data.sector`, not `data.sectors`) — live
  sector breadth.
- `/news` (`page_size`, `data.list`) — live news feed with real sources.
- `/currencies/{id}/market-snapshot` via a cached symbol→`currency_id` map —
  live prices for the MMX board (BTC/ETH/SOL/BNB/XRP/DOGE).
- `/etfs/summary-history` (`symbol` + `country_code`; legacy `us-*-spot` form
  parsed) — live BTC/ETH spot-ETF net inflow, streaks, cumulative.
- `/macro/events` — live macro calendar, flattened + classified (CPI/PPI →
  inflation, FOMC → rate, NFP → jobs …).
- `/indices` + `/indices/{ticker}/constituents` + `/indices/{ticker}/market-snapshot`
  — live SSI baskets and weights for the SSI/MMX comparison.

**Rate discipline:** a server-side TTL cache (2–5 min) fronts every call so
polling stays within the Demo plan's 10 req/min & 10k/mo limits. Intraday klines
require a whitelisted key on this plan, so `getKlines` short-circuits (charts
fall back to mock series, honestly labeled) to avoid wasted calls.

## 2. Ask Market is LIVE — Qwen only (closes the Wave 2 caveat)
The Wave 2 "LLM built but never run end-to-end" caveat is closed. `lib/llm.ts`
now calls a self-hosted **vLLM server running `Qwen/Qwen3-VL-8B-Instruct`** and
returns structured, grounded JSON. Verified end-to-end: Ask Market returns
`source: vLLM/Qwen/Qwen3-VL-8B-Instruct (grounded)` with a thesis + causes +
contradictions + confidence, citing the **live** news items. On any endpoint
error it falls back to the deterministic templated analysis.

## 3. NEW — AI Market Brief
`/api/marketmind/brief` (via `runMarketMindBrief()`) generates a live 2–3
sentence tape read — what's driving crypto, the clearest cross-source
disagreement, one thing to watch — grounded in the current feeds. Cached ~90s,
surfaced as a full-width card on `/dashboard`.

## 4. Zero-config, push-to-deploy
The SoSoValue key and the Qwen endpoint are **hardcoded**, so the app runs live
on Vercel with no environment variables. The engine is Qwen-only — the Anthropic
path was removed. `/api/marketmind/health` reports the active LLM provider.

_(Demo-key note: the hardcoded SoSoValue key is a Demo-plan key — 10k calls/mo,
no funds — intended for the judged demo.)_

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
