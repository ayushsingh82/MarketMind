import { NextResponse } from "next/server";
import { buildOrderbook, buildSodexFlow, buildSodexTickers, buildSodexTrades, type SodexFlow } from "@/lib/mock";
import { getMarkPrices, getOrderbook, getRecentTrades, hasSodexKey } from "@/lib/sodex";
import { takerBuyStats } from "@/lib/analytics";

export const runtime = "nodejs";
export const revalidate = 0;

// MarketMind reads SoDEX strictly as a microstructure signal layer.
// The route never sends an order — it returns spread, depth imbalance,
// taker-buy ratio (computed from REAL trades), recent flow, funding (from
// REAL perps mark-prices), and a derived signal label per pair.

const PAIRS = ["ETH-USDT", "BTC-USDT", "SOL-USDT", "ARB-USDT", "FET-USDT"];

function deriveSignal(spreadBps: number, takerBuyRatio: number): SodexFlow["signal"] {
  if (spreadBps > 12) return "thin";
  if (takerBuyRatio > 0.55) return "absorbing-offers";
  if (takerBuyRatio < 0.45) return "absorbing-bids";
  return "balanced";
}

function noteFor(signal: SodexFlow["signal"]): string {
  switch (signal) {
    case "absorbing-offers":
      return "Taker-buy share dominant; passive sellers being lifted.";
    case "absorbing-bids":
      return "Taker-sell share dominant; passive buyers being hit.";
    case "thin":
      return "Spread wide vs. baseline — liquidity thinning, treat fills as expensive.";
    default:
      return "Two-way flow; no directional microstructure tell.";
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol") ?? "ETH-USDT";

  if (hasSodexKey()) {
    try {
      // Per-pair flow from REAL trades + orderbook + funding.
      const marks = await getMarkPrices().catch(() => ({ data: [] }));
      const flow = await Promise.all(
        PAIRS.map(async (pair) => {
          const [ob, trades] = await Promise.all([
            getOrderbook(pair).catch(() => null),
            getRecentTrades(pair, 60).catch(() => ({ data: [] })),
          ]);
          const stats = takerBuyStats(trades.data ?? []);
          const spreadBps = ob?.data.spreadBps ?? 0;
          const depthImbalance = ob?.data.depthImbalance ?? 0;
          const base = pair.split("-")[0];
          const mark = marks.data.find((m) => m.symbol.toUpperCase().includes(base));
          const signal = deriveSignal(spreadBps, stats.takerBuyRatio);
          const fundingNote = mark ? ` Funding ${(mark.fundingRate * 100).toFixed(4)}%.` : "";
          return {
            symbol: pair,
            takerBuyRatio: stats.takerBuyRatio,
            spreadBps,
            depthImbalance,
            netFlow1m: stats.netFlow,
            fundingRate: mark?.fundingRate,
            signal,
            note: noteFor(signal) + fundingNote,
          };
        }),
      );

      // If the testnet gateway returned no usable microstructure (empty trades
      // AND empty books across all pairs), fall back to the deterministic mock
      // so the demo never renders a blank board. Funding (perps) may still be
      // live — we keep it on the flow rows when present.
      const liveDepth = flow.some((f) => f.spreadBps > 0 || f.netFlow1m !== 0 || f.depthImbalance !== 0);
      if (!liveDepth) {
        const mockFlow = buildSodexFlow().map((f) => {
          const base = f.symbol.split("-")[0];
          const mark = marks.data.find((m) => m.symbol.toUpperCase().includes(base));
          return mark ? { ...f, fundingRate: mark.fundingRate } : f;
        });
        const fundingNote = marks.data.length ? " (microstructure mock; funding live)" : " (offline preview)";
        return NextResponse.json({
          ok: true,
          data: {
            orderbook: buildOrderbook(symbol),
            ticker: buildSodexTickers().find((t) => t.symbol === symbol) ?? buildSodexTickers()[0],
            trades: buildSodexTrades(symbol),
            flow: mockFlow,
            tickers: buildSodexTickers(),
            funding: marks.data.find((m) => m.symbol.toUpperCase().includes(symbol.split("-")[0]))?.fundingRate,
          },
          source: `SoDEX${fundingNote}`,
          generatedAt: Date.now(),
        });
      }

      // Focal-pair detail (orderbook + trades) for the page's depth/tape panels.
      const [focalOb, focalTrades] = await Promise.all([
        getOrderbook(symbol).catch(() => null),
        getRecentTrades(symbol, 30).catch(() => ({ data: [] })),
      ]);

      const focalFlow = flow.find((f) => f.symbol === symbol) ?? flow[0];
      const focalMark = marks.data.find((m) => m.symbol.toUpperCase().includes(symbol.split("-")[0]));
      const ticker = {
        symbol,
        last: focalTrades.data[0]?.price ?? buildSodexTickers().find((t) => t.symbol === symbol)?.last ?? 0,
        change24h: 0,
        volume24h: focalTrades.data.reduce((s, t) => s + t.price * t.size, 0),
        takerBuyRatio: focalFlow?.takerBuyRatio ?? 0.5,
      };

      const orderbook = focalOb?.data ?? buildOrderbook(symbol);
      // Pad orderbook trades into the page's trade shape (already matches).
      return NextResponse.json({
        ok: true,
        data: {
          orderbook,
          ticker,
          trades: focalTrades.data,
          flow,
          tickers: flow.map((f) => ({
            symbol: f.symbol,
            last: orderbook.symbol === f.symbol ? ticker.last : 0,
            change24h: 0,
            volume24h: 0,
            takerBuyRatio: f.takerBuyRatio,
          })),
          funding: focalMark?.fundingRate,
        },
        source: "SoDEX/orderbook+trades+perps-funding (live)",
        generatedAt: Date.now(),
      });
    } catch (err) {
      return NextResponse.json({
        ok: true,
        data: {
          orderbook: buildOrderbook(symbol),
          ticker: buildSodexTickers().find((t) => t.symbol === symbol) ?? buildSodexTickers()[0],
          trades: buildSodexTrades(symbol),
          flow: buildSodexFlow(),
          tickers: buildSodexTickers(),
        },
        source: `SoDEX (fallback: ${(err as Error).message.slice(0, 80)})`,
        generatedAt: Date.now(),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    data: {
      orderbook: buildOrderbook(symbol),
      ticker: buildSodexTickers().find((t) => t.symbol === symbol) ?? buildSodexTickers()[0],
      trades: buildSodexTrades(symbol),
      flow: buildSodexFlow(),
      tickers: buildSodexTickers(),
    },
    source: "SoDEX (offline preview)",
    generatedAt: Date.now(),
  });
}
