# Wave 2 — Make the intelligence defensibly real

Wave 1 shipped a polished UI whose "intelligence" was largely fabricated: Ask
Market was regex + 5 canned paragraphs (no LLM installed), price-impact windows
were `rand()`, contradictions were ~90% hardcoded strings citing invented funding
rates, and live data that *was* fetched got discarded and overwritten by mock.

Wave 2 replaces those fakes with real computation. The zero-config demo is
preserved: with no `.env`, every route still falls back to the deterministic
mock in `lib/mock.ts` and `npm run dev` works. Real data / LLM take over
transparently when the corresponding key is present, with graceful fallback
otherwise. **Every route's `source` field states honestly which path produced
the response** (e.g. `"…(offline preview)"`, `"…(live)"`, `"heuristic (LLM error: …)"`).

## Keys and what they unlock

| Env var | Unlocks | Without it |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Real Claude call for Ask Market | Heuristic templated analysis (grounded by SoSoValue if that key is set) |
| `SOSO_API_KEY` | Live SoSoValue news/market/sectors/macro/klines/indices/ETF | Deterministic mock |
| (none needed) | SoDEX reads are unauthenticated; tried automatically | Mock microstructure; `SODEX_DISABLE=1` forces mock |

Endpoint paths are env-overridable (`SOSO_*_PATH`, `SODEX_*_BASE`) so the demo
can be repointed without code changes if the spec drifts.

---

## Feature-by-feature changelog

### 1. Ask Market is a real LLM call — REAL (key) / heuristic (no key)
- **New `lib/llm.ts`** — installs and uses `@anthropic-ai/sdk`. `runMarketMindLLM()`
  makes a single non-streaming `messages.create` call with model
  **`claude-sonnet-4-6`**, reads `ANTHROPIC_API_KEY` from env.
- A frozen system prompt (no timestamps/IDs) + a large grounding block (live
  news / sectors / macro / market / ETF JSON) are both marked
  `cache_control: { type: "ephemeral" }`; the volatile question sits in its own
  trailing block with no marker, so repeated questions in a session reuse the
  cached prefix. Cache hit/write tokens are read from `response.usage`.
- The model is instructed to return a JSON object matching the existing
  `AskResponse` shape; `coerceAnalysis()` defensively validates/backfills it so
  the **UI is untouched** (same shape: thesis/causes/evidence/impact/
  contradictions/confidence/suggestions/citations).
- `lib/marketmind.ts` `runMarketMindAnalysis()` now: gathers grounded context →
  calls the LLM when `ANTHROPIC_API_KEY` is set → falls back to the templated
  heuristic (with an honest source label) on missing key or LLM error.
- **Verified:** no-key path returns a structured grounded heuristic answer
  (`source: heuristic/intelligence-engine …`). The LLM path is exercised by the
  typecheck/build; it could not be executed end-to-end here because no
  `ANTHROPIC_API_KEY` was present in the environment.

### 2. Real price-impact computation — REAL (key) / derived fallback
- **New `lib/analytics.ts` `computePriceImpact()`** — given klines (ascending,
  epoch-ms) and a headline `release_time`, it anchors on the bar at/just before
  release, measures the **actual** return over the N-minute window, finds the
  peak |return| in the window, and estimates **decay half-life** as the time for
  the move to fall to half of peak.
- `lib/marketmind.ts` `buildLiveNewsImpacts()` pulls `/currencies/{id}/klines`
  per focal symbol and replaces the old `rand()` `priceImpactPct` /
  `reactionWindowMin` / `decayHalfLifeMin` with measured values. The `aiSummary`
  reports "Measured +X% over Nm … half-life ≈ Mm".
- Fallback: when klines are unavailable for a symbol, the impact is a small
  sign-only estimate from derived sentiment and the summary says so.
- Source label reports the measured fraction, e.g. `"…klines (3/8 price-measured)"`.

### 3. Stop discarding fetched live data — REAL (key)
- **(a) SSI** (`app/api/marketmind/ssi/route.ts` + new `lib/ssi.ts`
  `buildLiveSsiIndices()`): reads `/indices` + `/indices/{t}/constituents` and
  joins with the market snapshot to compute live per-constituent **24h
  contribution** (weight × 24h return) and index NAV. The previous code fetched
  the snapshot and threw it away, returning pure mock.
- **(b) News** (`app/api/marketmind/news/route.ts`): no longer overwrites live
  sentiment/conviction/classification with mock. Sentiment and conviction are
  **derived from real headline text + engagement** (the SoSoValue `/news` feed
  has no native sentiment field — `deriveSentiment`/`deriveConviction`/
  `classifyNews` in `lib/analytics.ts`).
- **(c) /series and /asset**: `/series` rebases real BTC+ETH klines to 100 and
  tilts an AI proxy by the live AI-sector 24h move; `/asset` returns real price +
  24h change from the snapshot, real OHLC candles, and a **beta-to-BTC and return
  z-score computed from klines**. Both fall back to mock without a key.

### 4. Multi-source contradiction detection — REAL (keys) — signature hook
- `lib/marketmind.ts` `detectContradictions()` now runs **four** real
  cross-source checks, each citing **two real API surfaces**:
  1. news bias **×** sector breadth (SoSoValue news × SoSoValue sectors)
  2. news bias **×** SoDEX taker-buy ratio (SoSoValue news × SoDEX `/markets/{sym}/trades`)
  3. news bias **×** perps funding rate (SoSoValue news × SoDEX `/markets/mark-prices`)
  4. macro-window proximity **×** risk-on sector breadth (SoSoValue macro × sectors)
- The **3 hardcoded `buildContradictions()` entries** (fake funding/CPI/dominance
  numbers) were **deleted**. `buildContradictions()` now derives at most one
  honest offline-preview flag from the same deterministic mock (news bias vs
  sector breadth) and invents no funding/CPI/dominance figures.
- When no surfaces disagree, the route returns `[]` with a source naming the
  surfaces it checked — no fabricated disagreement.

### 5. ETF flows integration — REAL (key) / mock series
- **`getEtfFlows()`** added to `lib/sosovalue.ts` (`/etfs/summary-history`,
  negative `total_net_inflow` = outflow).
- **New `app/api/marketmind/etf/route.ts`** computes latest net inflow, 5-day
  cumulative, and an inflow/outflow streak per spot BTC/ETH ETF.
- Surfaced on the dashboard (new panel **G2 · ETF flows** with a per-day bar
  sparkline) and fed into the AutoFund handoff context and the Ask grounding
  block.

### 6. Real SoDEX flow signal — REAL where the testnet returns data
- `app/api/marketmind/sodex/route.ts` computes **taker-buy ratio + net flow from
  real `/markets/{sym}/trades`** (`takerBuyStats` in `lib/analytics.ts`), **depth
  imbalance + spread from real `/markets/{sym}/orderbook`**, and **funding from
  real perps `/markets/mark-prices`**. `lib/sodex.ts` was rewritten for the
  verified unauthenticated testnet gateway (`https://testnet-gw.sodex.dev`) with
  tolerant response normalization and a 6s timeout.
- **Honest degradation:** during testing the testnet returned live **funding**
  but empty trades/orderbook. The route detects "no usable microstructure" and
  falls back to mock spread/depth/tape **while keeping the live funding overlaid**,
  labelling the source `"SoDEX (microstructure mock; funding live)"`. Funding is
  also shown per-pair on the SoDEX Flow page.

### 7. MarketMind Index (MMX) — REAL computation, published methodology
- **`lib/ssi.ts` `buildMarketMindIndex()`** computes a basket the engine rates
  highest-conviction: market-cap weighting over 8 majors/narrative leaders with a
  **35% single-name cap** (excess redistributed proportionally, iterated to
  stability), a **live NAV** computed from constituent prices (real snapshot when
  keyed, reference caps offline), a **"last rebalanced" timestamp**, and a
  conviction score from breadth.
- Surfaced on `/ssi` with the full constituent table (target vs raw mcap weight,
  24h, contribution), a one-page methodology panel, and a NAV/conviction summary.
  Live SSI baskets are shown alongside as reference/comparison.
- **No overclaim:** the page states MMX is *computed and published*, not an
  on-chain mint — on-chain SSI index creation is committee-gated.

### 8. "Send to AutoFund" handoff — REAL, self-contained
- **New `app/api/marketmind/autofund/route.ts`** emits a structured
  `marketmind.autofund.signal/v1` JSON object: MMX target weights, conviction
  score, NAV change, and the **active contradiction flag** with a
  `recommendedAction` gate (`hold` on high-severity disagreement,
  `scale-cautiously` if any, else `proceed`).
- `/ssi` has a **"Send to AutoFund →"** button that fetches the signal, renders
  it, and offers a `download signal.json`. No runtime dependency on the other repo.

---

## Files changed / added

**Added**
- `lib/llm.ts` — Claude client + grounded structured-JSON call + prompt caching.
- `lib/analytics.ts` — derived sentiment/conviction/classification, real
  price-impact + decay half-life, taker-buy stats, symbol→pair mapping.
- `lib/ssi.ts` — live SSI basket join + the computed MarketMind Index (MMX).
- `app/api/marketmind/etf/route.ts` — ETF flow summary route.
- `app/api/marketmind/autofund/route.ts` — AutoFund handoff signal.

**Rewritten / substantially changed**
- `lib/sosovalue.ts` — corrected endpoint paths to the verified OpenAPI v1 spec;
  added `getKlines`, `getIndices`, `getIndexConstituents`, `getEtfFlows`,
  tolerant response unwrapping.
- `lib/sodex.ts` — rewritten for the unauthenticated testnet gateway; real
  orderbook/trades/klines/mark-prices with normalization + timeouts.
- `lib/marketmind.ts` — real LLM Ask path + heuristic fallback; `buildLiveNewsImpacts`
  (real price-impact); 4-check multi-source `detectContradictions`.
- `lib/mock.ts` — `buildContradictions` no longer fabricates funding/CPI/dominance.
- `app/api/marketmind/{news,ssi,sodex,series,asset}/route.ts` — wired to real data
  with mock fallback.
- `app/ssi/page.tsx` — MMX panel + methodology + AutoFund button (also fixed the
  two pre-existing `react/no-unescaped-entities` lint errors).
- `app/dashboard/page.tsx` — ETF flows panel.
- `app/sodex-flow/page.tsx` — per-pair funding-rate row.

## Build / lint / smoke-test results
- `npm run build` — **clean** (all 19 API routes + 10 pages compile; TypeScript
  passes in ~5s).
- `npm run lint` — **0 errors**, 3 pre-existing warnings in `app/components/Dither.tsx`
  (unused eslint-disable directives in a WebGL component untouched by Wave 2).
- Dev smoke-test (no keys → demo path):
  - All 8 pages return 200; `/api/marketmind/health` ok.
  - `POST /ask` returns a structured grounded heuristic `AskResponse`.
  - `/contradictions` returns `[]` honestly (no live surfaces) — fakes are gone.
  - `/ssi` returns MMX (NAV, 35% cap enforced: BTC & ETH capped, SOL up-weighted)
    + 3 mock baskets.
  - `/etf`, `/sodex`, `/news`, `/series`, `/asset`, `/sectors`, `/autofund` all
    return well-formed payloads with honest source labels.
  - `/sodex` reached the live testnet perps endpoint (real funding rates) and
    fell back to mock microstructure where trades/books were empty.

## Honest status summary

| Path | Real when… | Verified end-to-end here |
| --- | --- | --- |
| Ask Market LLM | `ANTHROPIC_API_KEY` set | No (no key in env); fallback verified |
| Price-impact math | `SOSO_API_KEY` set (klines) | Math unit-correct; live join needs key |
| Contradictions (4 checks) | `SOSO_API_KEY` and/or SoDEX reachable | Logic verified; live disagreement needs keys/data |
| SoDEX funding | testnet reachable | Yes — live funding returned |
| SoDEX trades/orderbook | testnet returns data | Partial — testnet returned empty; mock fallback |
| ETF flows | `SOSO_API_KEY` set | Mock series verified; live needs key |
| MMX index | always (live prices with key) | Yes — computed, cap rule verified |
| AutoFund handoff | always | Yes — signal payload verified |
