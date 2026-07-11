# MarketMind — AI Market Intelligence Engine

> A one-person research desk. It ingests SoSoValue news, market, sector, macro, SSI index, and SoDEX microstructure signals, scores cross-source disagreement, ranks narrative momentum, and explains *why* the market is doing what it's doing — every claim cited, every contradiction surfaced, nothing auto-traded.

**Built for the [SoSoValue Buildathon](https://luma.com/soSoValue-buildathon).**

```
SoSoValue news + market + sectors + macro      ┐
SoDEX microstructure (spread / taker / depth)  ┼──▶ Intelligence Engine ──▶ Ask Market
SSI Protocol indices + staking yield context   ┘     (cause · effect · contradiction)
                                                          │
                                                          ▼
                                              Personal Insights · Alerts · Watchlist
```

---

## 1. The pitch

Most trading apps tell you **what** moved. The hard part is **why** — and whether the *why* you're being told actually agrees with the data. The retail experience is fragmented: a chart in one tab, a news feed in another, a macro calendar somewhere else, a staking dashboard buried in a wallet, a DEX order book that nobody opens. By the time a user has stitched those views together, the move has decayed.

**MarketMind** is the research-desk side of that problem. It collapses six SoSoValue / SoDEX feeds into a single intelligence surface that:

- **Explains the move** in natural language with citations (Ask Market).
- **Measures the cause** via news → price-reaction windows + decay half-lives.
- **Flags disagreement** when news, breadth, derivatives, and on-chain flow tell different stories (Contradiction Stack).
- **Tracks narratives** with velocity, breadth, and persistence scores — not just price.
- **Personalizes** insights to the user's watchlist + SSI exposure.
- **Never trades.** MarketMind is the analyst, not the executor. It pairs cleanly with an autonomous fund agent (e.g. AutoFund AI) but stays read-only on purpose, so it can be used by people who *can't or won't* hand over execution authority.

**Target users:**
- Retail traders who currently glue together five tabs to understand a single move.
- DAO / treasury research teams that need an auditable explanation of market regime changes before any execution decision.
- Crypto journalists and analysts who need cited, evidence-backed cause-effect chains in real time.
- Fund managers who want a *second opinion* layer that explicitly checks for contradiction with their own bias.

**The user value loop:**

| Step | Input | Output | Where the user sees it |
| --- | --- | --- | --- |
| Ingest | SoSoValue news + market + sectors + macro + SSI; SoDEX orderbook + trades; staking yields | Normalized signal vector | Intelligence Board (pulse rail) |
| Correlate | Signal vector | Cause-effect chain · narrative momentum · contradiction set | Headline Impact Strip · Narrative Stack · Contradiction Stack |
| Explain | Correlation graph | Plain-language thesis with citations + confidence | Ask Market · News Intelligence · Asset Deep-Dive |
| Personalize | Explanation + user watchlist | Asset-specific insight + alert | Personal Insights · Watchlist |
| Verify | Insight | "Why this conclusion?" trail of cited sources | Citations panel on every Ask response |

---

## 2. Live demo

**Zero setup. No API keys needed.** The app ships with a deterministic dataset that mirrors SoSoValue + SoDEX response shapes, so `npm run dev` just works.

> **Wave 3 — Ask Market is live by default.** Ask Market and the new **AI Market Brief** (`/dashboard`) reason with a *real* grounded model out of the box — a self-hosted vLLM server running `Qwen/Qwen3-VL-8B-Instruct` via an OpenAI-compatible endpoint (`lib/llm.ts`), no key required. Set `ANTHROPIC_API_KEY` to use Claude instead (with prompt caching), or override the OpenAI-compatible endpoint with `OPENAI_BASE_URL` / `OPENAI_MODEL` / `OPENAI_API_KEY` (RunPod proxy URLs are ephemeral). Any endpoint error falls back to the deterministic templated analysis. See `WAVE3.md`.

```bash
git clone https://github.com/ayushsingh82/MarketMind.git
cd MarketMind
npm install
npm run dev
# open http://localhost:3000
```

Ten pages, all live-data driven via polling:

| Route | Purpose |
| --- | --- |
| `/` | Landing — hero with cause-effect framing |
| `/dashboard` | Intelligence Board — pulse rail, headline impact strip, narrative stack, contradiction stack, sector breadth, SoDEX flow, SSI baskets |
| `/ask` | Ask Market — interactive analyst Q&A with cited evidence + contradiction list + confidence |
| `/news` | News Intelligence — news with measured price impact, decay half-life, classification, AI summary |
| `/sectors` | Sectors & Narratives — leaders/laggards + narrative velocity rankings |
| `/sodex-flow` | SoDEX Flow — spread, depth imbalance, taker-buy ratio, derived microstructure signal |
| `/staking` | Staking & Yield — yield landscape across native / liquid / restaking, with risk-tier note |
| `/ssi` | SSI Indices — basket composition + 24h contribution + drift score per index |
| `/asset` | Asset Deep-Dive — drivers, related assets, AI narrative, candles |
| `/insights` | Personalized Insights — watchlist-aware insights + alert feed |
| `/watchlist` | Watchlist — saved assets with thesis + risk tone |

**Hero moment to demo:** open `/dashboard`, point at the **Contradiction Stack** card, and refresh. Every entry shows two signals from different SoSoValue surfaces (news bias vs. sector breadth, news conviction vs. funding rate, etc.) along with MarketMind's resolution — that's the product in 5 seconds: cited disagreement detection that no single dashboard panel can show on its own.

---

## 3. SoSoValue API integration

This is the data spine of the product. SoSoValue API access is wired through `lib/sosovalue.ts` using the `x-soso-api-key` header pattern, and consumed downstream by the intelligence engine.

### What we used from SoSoValue (at a glance)

| SoSoValue product / feature | What MarketMind does with it | Where in the app |
| --- | --- | --- |
| **SoSoValue Terminal — news** | Stream headlines into the Impact Engine; measure price reaction window, decay half-life, classification | Dashboard Headline Impact Strip · `/news` News Intelligence |
| **SoSoValue Currency Market Snapshot** | Drive the cross-asset normalized chart, asset deep-dive, contradiction detector's price side | Dashboard `cross-asset normalized` panel · `/asset` |
| **SoSoValue Sector Spotlight** | Render sector breadth bar; feed Narrative Engine with per-sector rotation strength | Dashboard `sector breadth` · `/sectors` |
| **SoSoValue Macro Events** | Power Ask Market's macro reasoning + macro-risk pulse + Contradiction Engine's calendar side | Dashboard pulse rail · `/ask` |
| **SSI Protocol — Index Market Snapshot** | Surface SSI basket composition + drift + 24h contribution as research context | Dashboard `SSI Protocol baskets` · `/ssi` |

### How we called the API

- **Auth:** `x-soso-api-key` header from `process.env.SOSO_API_KEY`.
- **Base URL:** `https://openapi.sosovalue.com/openapi/v1` (overridable via `SOSO_BASE_URL`).
- **Caching:** `cache: "no-store"` — every signal read is fresh; we never serve stale market data.
- **Error contract:** non-2xx throws; routes wrap in try/catch and fall back to deterministic mock so the demo stays alive even if the upstream key is missing or rate-limited.
- **Resilience:** every public route ships a deterministic mock fallback, and the JSON envelope's `source` field always tells the user whether they're seeing live or fallback data.

### Endpoints currently integrated

| SoSoValue Endpoint | HTTP | Purpose in MarketMind | UI panel | Code path |
| --- | --- | --- | --- | --- |
| `/openapi/v1/news/list` | `GET` | Headlines + sentiment + conviction. Drives the Impact Engine which measures price reaction windows + decay half-lives, classifies each item (macro / flow / regulatory / tech / narrative), and emits AI summaries. | Dashboard Headline Impact Strip · `/news` | `lib/sosovalue.ts::getNews()` |
| `/openapi/v1/currency/market-snapshot` | `GET` | Live spot prices + 24h delta. Drives the cross-asset normalized chart, the asset deep-dive, and the price side of the Contradiction Engine. | Dashboard `cross-asset normalized` · `/asset` | `lib/sosovalue.ts::getMarketSnapshot()` |
| `/openapi/v1/currency/sector-spotlight` | `GET` | Sector rotation strength. Renders directly as a 6-bar breadth chart, and feeds the Narrative Engine's breadth score and the Contradiction Engine's breadth-vs-news disagreement check. | Dashboard `sector breadth` · `/sectors` | `lib/sosovalue.ts::getSectorSpotlight()` |
| `/openapi/v1/macro/events` (configurable via `SOSO_MACRO_PATH`) | `GET` | Macro calendar — drives macro-risk pulse, the macro side of Ask Market reasoning, and the macro/event window check in contradiction detection. | Dashboard pulse rail · `/ask` | `lib/sosovalue.ts::getMacroEvents()` |
| `/openapi/v1/index/market-snapshot` | `GET` | SSI Protocol on-chain index quotes. Surfaced as basket composition, 24h contribution, drift score per index. Read-only research; MarketMind never rebalances the basket. | `/ssi` · Dashboard `SSI Protocol baskets` | `lib/sosovalue.ts::getIndexMarketSnapshot()` |

All endpoints fan-out fetched and exposed downstream by typed route handlers. Each public-facing route also has a deterministic mock fallback so the demo never goes blank if a key is rate-limited or unset — the response `source` field always tells the user whether they're seeing live or fallback data.

### Integration pattern

```ts
// lib/sosovalue.ts
const response = await fetch(`${SOSO_BASE_URL}${path}`, {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    "x-soso-api-key": SOSO_API_KEY,
  },
  cache: "no-store",
});
```

### Signal → reasoning wiring

```ts
// lib/marketmind.ts
export async function runMarketMindAnalysis(query: string) {
  const tags = classifyIntent(query);            // direction, narrative, macro, asset
  const symbols = extractSymbols(query);
  const [news, market, macro] = await Promise.all([
    getNews(8),                                  // SoSoValue
    getMarketSnapshot(),                         // SoSoValue
    getMacroEvents(),                            // SoSoValue
  ]);
  // pickThesis() composes natural language; evidence cites the news rows
  // that match the asked symbols; contradictions come from the live
  // detector that joins news bias with sector breadth.
}
```

The contradiction detector is where MarketMind's intelligence story lives:

```ts
// lib/marketmind.ts
const newsBias = bullishNews - bearishNews;
const sectorBreadth = sectors.reduce((acc, s) => acc + (s.change24h > 0 ? 1 : -1), 0);
if (Math.sign(newsBias) !== Math.sign(sectorBreadth)) {
  contradictions.unshift({
    title: "Live: news bias and sector breadth disagree",
    signalA: { label: "News bias", value: newsBias, source: "SoSoValue news" },
    signalB: { label: "Sector breadth", value: sectorBreadth, source: "SoSoValue sectors" },
    severity: "high",
    resolution: "Treat the headline tone as tactical until breadth confirms or fades.",
  });
}
```

---

## 4. SoDEX integration (read-only microstructure)

MarketMind treats SoDEX as a **signal source, not an execution destination**. The intelligence engine reads orderbook spread, depth imbalance, taker-buy ratio, and recent fill velocity per pair to surface a derived microstructure signal:

- `absorbing-offers` — taker-buy share dominant; passive sellers being lifted
- `absorbing-bids` — taker-sell share dominant; passive buyers being hit
- `thin` — spread wide vs. baseline; treat fills as expensive
- `balanced` — two-way flow; no directional microstructure tell

The client lives in `lib/sodex.ts` and is exposed through `GET /api/marketmind/sodex`:

```ts
// lib/sodex.ts
export async function getOrderbook(symbol: string) {
  return request<{ data: Orderbook }>(`${SODEX_ORDERBOOK_PATH}?symbol=${symbol}`);
}
```

| SoDEX Endpoint | HTTP | Purpose in MarketMind | UI panel |
| --- | --- | --- | --- |
| `/v1/market/orderbook` | `GET` | Spread + depth imbalance signal | Dashboard `SoDEX microstructure` table · `/sodex-flow` |
| `/v1/market/ticker` | `GET` | Taker-buy ratio + 24h volume | Dashboard `SoDEX microstructure` table · `/sodex-flow` |
| `/v1/market/trades` | `GET` | Recent fill velocity, used in flow signal classification | `/sodex-flow` recent prints |

**Why read-only?** AutoFund AI (the companion buildathon submission) is the autonomous fund. MarketMind is the analyst. By keeping execution out, MarketMind is usable by people who can't or won't hand over signing authority, and stays valuable as a *second-opinion* layer even when paired with another agent — including a human one.

---

## 5. Project routes

### Public dashboard pages
- `/` · `/dashboard` · `/ask` · `/news` · `/sectors` · `/sodex-flow` · `/staking` · `/ssi` · `/asset` · `/insights` · `/watchlist`

### API surface

| Route | Method | Purpose | SoSoValue / SoDEX endpoint hit |
| --- | --- | --- | --- |
| `/api/marketmind/ask` | POST | Runs the intelligence engine: classifies intent, extracts symbols, joins news + market + macro, returns thesis + evidence + contradictions + suggestions + citations + confidence | `news/list`, `currency/market-snapshot`, `macro/events` |
| `/api/marketmind/summary` | GET | Pulse rail KPIs: regime, signal confidence, macro risk, news velocity, contradiction count, narratives tracked | — (derived) |
| `/api/marketmind/series` | GET | Cross-asset normalized series for the BTC / ETH / AI / index chart | `currency/market-snapshot` (derived) |
| `/api/marketmind/sentiment` | GET | Bullish / bearish / neutral stack over rolling windows | `news/list` (aggregated) |
| `/api/marketmind/news` | GET | News with measured price impact, decay half-life, classification, AI summary | `news/list` |
| `/api/marketmind/sectors` | GET | Sector spotlight with leaders / laggards | `currency/sector-spotlight` |
| `/api/marketmind/contradictions` | GET | Live cross-source disagreement detector | `news/list` + `sector-spotlight` |
| `/api/marketmind/narratives` | GET | Narrative momentum scores (velocity / breadth / persistence) per theme | derived |
| `/api/marketmind/insights` | GET | Personalized insights + alert feed for the user's watchlist | derived |
| `/api/marketmind/watchlist` | GET | Watchlist items with thesis + risk tone + 24h delta | `currency/market-snapshot` |
| `/api/marketmind/asset` | GET | Asset deep-dive: price, drivers, related assets, AI narrative, candles | `currency/market-snapshot` |
| `/api/marketmind/macro` | GET | Macro calendar | `macro/events` |
| `/api/marketmind/ssi` | GET | SSI basket composition, drift, 24h contribution per index | `index/market-snapshot` |
| `/api/marketmind/staking` | GET | Staking yield landscape across native / liquid / restaking with risk-tier note | derived |
| `/api/marketmind/sodex` | GET | SoDEX microstructure: orderbook + ticker + trades + per-pair derived flow signal | SoDEX `/orderbook`, `/ticker`, `/trades` |
| `/api/marketmind/health` | GET | Health probe — reports SoSoValue + SoDEX availability | — |

Each JSON response is envelope-wrapped with `{ ok, data, source, generatedAt }` so the UI can show provenance and last-updated state on every panel.

---

## 6. Architecture

```
MarketMind/
├── app/
│   ├── (dashboard pages)
│   ├── api/marketmind/         16 typed JSON routes
│   └── components/
│       ├── MarketMindLayout    sectioned terminal-style sidebar with code tags
│       ├── Panel               left-rail accent + soft underline divider
│       ├── Pulse               horizontal pulse rail chip (not a KPI grid)
│       ├── StatusDot           live · stale · error indicator + last-updated
│       └── MarketMindChartCard chart primitive (recharts)
├── lib/
│   ├── sosovalue.ts            SoSoValue API client (the spine)
│   ├── sodex.ts                SoDEX read-only microstructure client
│   ├── marketmind.ts           Intelligence engine + contradiction detector
│   ├── mock.ts                 Deterministic time-bucketed generators
│   ├── types.ts                Domain models (Insight, Contradiction, NarrativeMomentum, AskResponse, …)
│   └── useLiveData.ts          Polling hook (status, last-updated)
└── (Next.js 16, TypeScript, Tailwind v4, recharts)
```

**Key design choices:**
- **Polling-driven UI.** Every panel polls its endpoint on a domain-tuned cadence (5s summary, 6s SoDEX flow, 7s series, 9–13s narratives / contradictions / SSI). Status dots show `live | stale | error` so the user always knows the data is fresh.
- **Deterministic time-bucketed mock fallback.** When no SoSoValue / SoDEX key is set, internal generators (`lib/mock.ts`) re-seed every minute / hour so charts still feel alive in the demo. Real data takes over the moment a key is configured.
- **Different visual language from AutoFund.** The dashboard is a 6-column bento layout with a horizontal pulse rail (not a KPI grid), a headline impact strip (not a multi-line equity chart), narrative momentum bars (not strategy score bars), and a contradiction stack (not a reasoning timeline). The sidebar uses code-tag suffixes (`00`, `10`, `20`) and three section groupings — Overview / Signals / Personal — instead of a flat nav.
- **Source labels on every panel.** Every chart card shows where its data came from — `SoSoValue/news + internal/impact-engine`, `SoDEX/orderbook+ticker+trades`, `internal/contradiction-engine` — so the integration story is explicit, not buried.
- **Read-only by design.** No order routing, no wallet signing, no execution endpoints. MarketMind is the analyst layer that pairs with anything (a fund agent, a copilot, a user).

---

## 7. The intelligence engine

The engine has four concerns. Each is a small, testable function in `lib/marketmind.ts` and `lib/mock.ts`.

### 7a. Cause-effect attribution
Every news item is enriched with `priceImpactPct`, `reactionWindowMin`, and `decayHalfLifeMin`. The Headline Impact Strip on the dashboard renders this directly: each card shows the news, its measured price reaction, and how fast that reaction decays. Source: `buildNewsImpacts()` joins SoSoValue news with the price snapshot before/after each headline.

### 7b. Contradiction detection
`detectContradictions()` joins live news bias (count of bullish vs. bearish headlines) with sector breadth (count of sectors up vs. down). When the signs disagree, it emits a high-severity contradiction with both signal values cited, plus a one-line resolution. The Contradiction Stack on the dashboard is the surface; the same items show up as constraints in Ask Market answers.

### 7c. Narrative momentum
Each tracked narrative (AI infrastructure rotation, ETF flow reacceleration, restaking, RWA, L2 fee compression, memecoin tail-vol) gets three independent scores: **velocity** (how fast the narrative is spreading), **breadth** (how many tokens it touches), **persistence** (how long it has held). The combined score classifies state as `emerging → accelerating → peaking → fading`. The Narrative Momentum Stack on the dashboard renders all three bars per narrative.

### 7d. Ask Market reasoning
`runMarketMindAnalysis(query)` is a small NLP layer:
1. **Classify intent** — directional (up/down), narrative, macro, sector, asset.
2. **Extract symbols** — pull tickers from a curated universe.
3. **Pick thesis** — choose a thesis template based on intent + symbols.
4. **Cite evidence** — pull the top-3 news items that match the asked symbols.
5. **Attach contradictions** — surface any live disagreement that touches the asked topic.
6. **Score confidence** — based on intent specificity, symbol match, macro context.

The result is the structured `AskResponse` type: `thesis`, `evidence[]`, `contradictions[]`, `causes[]`, `impact`, `confidence`, `suggestions[]`, `sources` (counts), `citations[]`. The `/ask` page renders all of this with a single round-trip.

---

## 8. Setup

### Prerequisites
- Node.js ≥ 20

### Install & run
```bash
npm install
npm run dev
# → http://localhost:3000
```

That's it. **No `.env`, no API keys, no signup.** Every chart and panel is populated from a deterministic generator that mirrors SoSoValue + SoDEX response shapes so the demo is reproducible across machines.

### Optional: plug in real keys later

If you want to swap the deterministic dataset for live SoSoValue / SoDEX calls, set any of these env vars in `.env.local` — every one is optional and falls back to the mock if absent.

```bash
# SoSoValue (optional — UI is identical with or without)
SOSO_API_KEY=...
SOSO_BASE_URL=https://openapi.sosovalue.com/openapi/v1
SOSO_NEWS_PATH=/news/list
SOSO_SECTOR_PATH=/currency/sector-spotlight
SOSO_MACRO_PATH=/macro/events

# SoDEX (optional — microstructure pulls return mock when unset)
SODEX_API_KEY=...
SODEX_BASE_URL=https://testnet-api.sodex.com
SODEX_ORDERBOOK_PATH=/v1/market/orderbook
SODEX_TICKER_PATH=/v1/market/ticker
SODEX_TRADES_PATH=/v1/market/trades
```

### Production build
```bash
npm run build
npm run start
```

---

## 9. Buildathon roadmap

| Wave | Window | Status | Focus |
| --- | --- | --- | --- |
| **Wave 1 — Concept / Prototype** | May 1–12 | **✅ Shipped** | 5 SoSoValue endpoints integrated (news / market / sectors / macro / SSI index), 3 SoDEX read-only endpoints (orderbook / ticker / trades), 16 typed API routes, 11 live-data pages, intelligence engine with cause-effect + contradiction detection + narrative momentum, polling architecture, deterministic fallback, distinct dashboard UI language vs. AutoFund. |
| **Wave 2 — Build Phase I** | May 18–29 | 🚧 Planned | LLM-backed Ask Market (Claude / GPT) with retrieval over the last N hours of news + market state, persistent watchlist (Supabase), event-impact decay curves wired to real history, mobile responsive pass. |
| **Wave 3 — Build Phase II** | Jun 4–15 | 🚧 Planned | Telegram / Slack bot surface for Ask Market with citations, exportable cause-effect JSON for journalists / DAO governance, regime classification model (risk-on / risk-off / chop) with confidence trend, multi-watchlist + share links. |

---

## 10. Judging-criteria mapping

| Category | Where it shows up |
| --- | --- |
| **User Value & Practical Impact (30%)** | Solves a *different* problem from AutoFund AI: not "automate a fund," but "explain the move + flag when sources disagree." Targets a wider audience (retail traders, journalists, DAO research, fund managers) who can't or won't delegate execution. Every conclusion is cited; every contradiction is named, not hidden. |
| **Functionality & Working Demo (25%)** | Live dashboard at `npm run dev`, 16 working API routes, 11 pages all reading polled live data with status indicators, hero contradiction-stack moment, deterministic fallback so the demo never goes blank. |
| **Logic, Workflow & Product Design (20%)** | Clear five-step pipeline (Ingest → Correlate → Explain → Personalize → Verify) reflected one-to-one in the UI. Intelligence engine has four discrete concerns (cause-effect, contradiction, narrative, ask) — each documented in §7 of this README. Visual language deliberately differentiated from AutoFund AI (bento layout, pulse rail, code-tagged sidebar) to communicate the different role. |
| **Data / API Integration (15%)** | Five SoSoValue endpoints integrated as the data spine — `news/list`, `currency/market-snapshot`, `currency/sector-spotlight`, `macro/events`, `index/market-snapshot`. Three SoDEX endpoints integrated as a read-only microstructure signal — `orderbook`, `ticker`, `trades`. Each maps to a specific UI panel. SSI Protocol surfaced as research-grade basket explanation, never rebalanced. |
| **UX & Clarity (10%)** | Sectioned sidebar with code tags (`00`, `10`, `20`), terminal-style typography, source labels + last-updated timestamps on every panel, status dots showing data freshness, headline impact strip with measured price reaction + decay half-life, contradiction stack as the hero panel. |

---

## 11. How MarketMind differs from AutoFund AI

Both are SoSoValue Buildathon submissions in the same family of agentic finance applications, but they solve different problems and a user can run them side-by-side.

| Axis | AutoFund AI | MarketMind |
| --- | --- | --- |
| Role | Autonomous fund agent | Read-only research desk |
| Output | Orders + allocation changes | Cited explanations + contradictions |
| SoDEX usage | Submits orders (EIP-712 typed-data) | Reads microstructure signals only |
| SSI Protocol usage | Tracks SSI as benchmark + index strategy input | Explains SSI baskets as research context |
| Hero moment | One-click "Run trading cycle" pipeline | Contradiction Stack — cited disagreement nobody else surfaces |
| User question answered | "What should the fund do?" | "Why is the market doing this — and what disagrees?" |
| Visual language | Corner-bracket KPI cards, multi-line equity chart, strategy score bars, reasoning timeline | Pulse rail, headline impact strip, narrative momentum bars, contradiction stack, code-tagged sidebar |
| Target user | Retail / DAO / quant who *will* delegate execution | Retail / journalist / research / fund manager who *won't* |

---

## 12. Submission checklist

- [x] Public GitHub repo: <https://github.com/ayushsingh82/MarketMind>
- [x] README with setup instructions (this file)
- [x] Working live demo (`npm run dev` → 11 pages + 16 API routes)
- [x] Genuine SoSoValue API integration (`lib/sosovalue.ts` + 5 endpoints feeding 5+ dedicated UI panels)
- [x] SoDEX integration (`lib/sodex.ts` + 3 read-only microstructure endpoints feeding the Dashboard SoDEX strip + `/sodex-flow` page)
- [x] SSI Protocol integration (basket composition + drift + 24h contribution surfaced on `/ssi` and the dashboard)
- [x] Clear use case (cause-effect intelligence + contradiction detection for traders / researchers / journalists / DAOs)
- [x] Complete flow from data input to actionable output (signal → correlation → explanation → personalization → verification)
- [ ] Demo video (recorded for Wave 1 submission)
- [x] Wave 1 changelog (see commit history)

---

## 13. References

- [SoSoValue API Documentation](https://sosovalue-1.gitbook.io/sosovalue-api-doc)
- [SoDEX API Documentation](https://sodex.com/documentation/api/api)
- [SoSoValue Buildathon Kickoff](https://luma.com/soSoValue-buildathon)
- [Common APIs (Notion)](https://www.notion.so/Common-APIs-167b57bd102a4c03b8f2421108fc66eb)

---

**Made for the SoSoValue Buildathon · Wave 1 submission · MarketMind = read-only intelligence layer**
