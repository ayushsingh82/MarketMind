import { NextResponse } from "next/server";
import { buildOrderbook, buildSodexFlow, buildSodexTickers, buildSodexTrades } from "@/lib/mock";
import { getOrderbook, getRecentTrades, getTicker, hasSodexKey } from "@/lib/sodex";

export const runtime = "nodejs";
export const revalidate = 0;

// MarketMind reads SoDEX strictly as a microstructure signal layer.
// The route never sends an order — it returns spread, depth imbalance,
// taker-buy ratio, recent flow, and a derived signal label per pair.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol") ?? "ETH-USDT";

  if (hasSodexKey()) {
    try {
      const [orderbook, ticker, trades] = await Promise.all([
        getOrderbook(symbol),
        getTicker(symbol),
        getRecentTrades(symbol),
      ]);
      return NextResponse.json({
        ok: true,
        data: {
          orderbook: orderbook.data,
          ticker: ticker.data,
          trades: trades.data,
          flow: buildSodexFlow(),
          tickers: buildSodexTickers(),
        },
        source: "SoDEX/orderbook+ticker+trades",
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
