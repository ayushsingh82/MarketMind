# MarketMind 

MarketMind is an intelligence-heavy concept: an AI analyst that explains market moves using SoSoValue data and clear reasoning without auto-trading.

## Theme

- Black background
- Orange accents
- White text

## Core Idea

1. Ingest SoSoValue news, macro, ETF, and index feeds.
2. Correlate events with market snapshots.
3. Explain "what happened" and "why it happened" in natural language.
4. Provide confidence-backed actionable insights for users.

## Required Docs

- [SoDEX API Overview](https://sodex.com/documentation/api/api)
- [SoSoValue API Docs](https://sosovalue-1.gitbook.io/sosovalue-api-doc)
- [Common APIs Notion](https://www.notion.so/Common-APIs-167b57bd102a4c03b8f2421108fc66eb)

## Run

```bash
npm install
npm run dev
```

## Backend API Scaffold

- `POST /api/marketmind/ask`
  - Request body:
    - `{ "query": "Why is BTC falling?" }`
  - Fetches:
    - `/feeds/news`
    - `/currency/market-snapshot`
    - `/macro/events`
  - Returns:
    - `summary`
    - `causes`
    - `impact`
    - `confidence`
    - `suggestions`

## Environment

```bash
SOSO_API_KEY=your_key_here
SOSO_BASE_URL=https://openapi.sosovalue.com/openapi/v1
```
