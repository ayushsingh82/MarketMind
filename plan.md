# soso2 (MarketMind) - Build Plan and Current Status

## 1) What has been done till now

### Product direction completed
- Upgraded concept to **AI Market Intelligence Engine**.
- Focus is now intelligence-first: multi-source reasoning, contradiction detection, and insight mapping.

### UI and routing completed
- Landing page is now full-view hero style at `/`.
- Main dashboard moved to `/dashboard`.
- Dashboard + internal pages use sidebar layout similar to DePinsight structure.
- Sidebar excludes `Landing`; clicking `MARKETMIND` routes to `/`.

### Page structure completed
- `/dashboard` (Market Intelligence Panel)
- `/ask`
- `/asset`
- `/insights`
- `/news`
- `/sectors`
- `/watchlist`

### Chart work completed (phase 1)
- Integrated `recharts` and upgraded `MarketMindChartCard` to render actual charts.
- Added active chart variants: market overview, timeline, sentiment, heatmap-style scatter, and correlation scatter.
- Design language updated (dark cards, border accents, themed orange highlights).
- Charts now load with local mock datasets, pending live API wiring.

## 2) Why charts are still not loading live data

- Chart library is integrated, but chart data is still mock and not fetched from APIs.
- No API fetch layer is connected for prices, sentiment, macro, and sectors.
- No normalized data model exists for event timelines (news -> price impact).
- No async state management per chart (loading/skeleton/error/retry).

## 3) APIs required (to make product real)

## A. Market Price APIs
- Historical candles for BTC/ETH/index assets.
- Correlation and returns series for selected watchlist pairs.

Expected usage:
- Market overview chart
- Correlation chart
- Asset deep-dive chart

## B. News and Event APIs
- Headline feed with timestamp and tags.
- Event impact scoring (bullish/bearish/neutral).
- News-to-asset mapping data.

Expected usage:
- News intelligence page
- News impact timeline chart
- Cause-effect cards

## C. Sentiment APIs
- Time-series sentiment scores by asset and market-wide aggregate.
- Bullish vs bearish split and confidence.

Expected usage:
- Sentiment area/line chart
- Alerts and trend cards

## D. Macro APIs
- Macro calendar (CPI/Fed/events).
- Macro risk score and surprise index.

Expected usage:
- Dashboard macro panel
- Contradiction detection context

## E. Sector APIs
- Sector classification list.
- Sector performance and relative strength.
- Heatmap matrix values.

Expected usage:
- Sector heatmap/trends page
- Top sectors cards

## F. Personalization APIs
- User watchlist CRUD.
- Interest profile / preferred sectors.
- Personalized insight feed.

Expected usage:
- Watchlist page
- Personalized insights page
- Alert relevance ranking

## G. LLM Intelligence APIs
- Ask Market query endpoint (RAG + tools).
- Structured reasoning response:
  - thesis
  - evidence
  - contradictions
  - confidence

Expected usage:
- Ask page answer panel
- AI explainability blocks across dashboard

## 4) What has to be done next (priority order)

1. **Set up API client foundation**
   - Add `lib/api/` with typed interfaces and fetch functions.
   - Add env config for API keys/base URLs.

2. **Connect chart components to APIs**
   - Replace local chart mocks with fetched market/news/sentiment data.
   - Add chart transformers for timeline, heatmap, and correlation payloads.

3. **Connect dashboard data**
   - `/dashboard` should fetch and render market summary, insights, and macro events dynamically.
   - Add last-updated and loading/error UX.

4. **Implement news impact pipeline**
   - Parse news events into timeline points.
   - Join with price windows for event impact visualization.

5. **Implement sentiment + sector analytics**
   - Sentiment trend line/area from endpoint data.
   - Sector heatmap matrix from sector performance API.

6. **Connect Ask + personalization**
   - Wire Ask Market to LLM endpoint.
   - Drive insights and alerts from watchlist-specific signals.

7. **Demo hardening**
   - Add fallback mock data mode.
   - Prepare one "judge moment": market move -> AI explains why with evidence.

## 5) Current blockers

- Data APIs are not yet wired into components.
- Charts render, but still use static local datasets.
- No endpoint contracts finalized in code for intelligence objects.

## 6) Definition of done for soso2

- All chart panels render live API data.
- Ask Market returns structured and evidence-backed responses.
- News/sentiment/macro/sector modules are connected to visible outputs.
- End-to-end intelligence flow works in a 2-3 minute demo.

## 7) Improvement plan (L2Beat-quality direction)

1. **Professional dashboard polish**
   - Enforce strict design system tokens for spacing, font sizes, and semantic colors.
   - Add reusable panel header component with source + freshness metadata.

2. **Richer market intelligence**
   - Add regime classification model (risk-on/risk-off/chop) with confidence trend.
   - Add narrative momentum scorecard per sector.

3. **Cause-effect explainability**
   - Build explicit event graph: event -> asset impact -> sector propagation.
   - Add contradiction badges with severity ranking and confidence.

4. **Advanced analytics**
   - Add rolling correlation matrix and beta-to-BTC per watchlist asset.
   - Add impact decay curves for key news events.

5. **Operational readiness**
   - Add loading skeletons, retry/error states, and source timeout fallback.
   - Add mock/live data toggle for stable demo mode.
