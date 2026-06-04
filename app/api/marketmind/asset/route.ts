import { NextResponse } from "next/server";
import { buildAssetDeepDive } from "@/lib/mock";
import { getKlines, getMarketSnapshot, hasSosoKey } from "@/lib/sosovalue";
import type { AssetDeepDive } from "@/lib/types";
import { round } from "@/lib/analytics";

export const runtime = "nodejs";
export const revalidate = 0;

// Asset deep-dive.
// Live: real price + 24h change from /currencies/{id}/market-snapshot, real OHLC
// candles from /currencies/{id}/klines, and a beta/z-score computed from the
// asset's klines vs BTC's klines. Drivers/narrative are heuristic context.
// No key → deterministic mock.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = (url.searchParams.get("symbol") ?? "ETH").toUpperCase();

  if (hasSosoKey()) {
    try {
      const [snapRes, assetK, btcK] = await Promise.all([
        getMarketSnapshot(symbol).catch(() => ({ data: [] })),
        getKlines(symbol, "1h", 24).catch(() => ({ data: [] })),
        getKlines("BTC", "1h", 24).catch(() => ({ data: [] })),
      ]);
      const snap = snapRes.data?.find((s) => s.symbol.toUpperCase() === symbol) ?? snapRes.data?.[0];
      const candles = (assetK.data ?? []).slice(-24).map((k, i, arr) => ({
        t: `T-${arr.length - 1 - i}h`,
        o: round(k.o, k.o < 5 ? 4 : 2),
        h: round(k.h, k.h < 5 ? 4 : 2),
        l: round(k.l, k.l < 5 ? 4 : 2),
        c: round(k.c, k.c < 5 ? 4 : 2),
      }));

      if (snap && candles.length >= 3) {
        const { beta, zscore } = betaAndZ(assetK.data, btcK.data);
        const change24h = round(snap.change24h, 2);
        const data: AssetDeepDive = {
          symbol,
          price: round(snap.price, snap.price < 5 ? 4 : 2),
          change24h,
          drivers: [
            { label: "24h momentum", weight: clampW(50 + change24h * 6), direction: change24h >= 0 ? "+" : "-" },
            { label: "Beta to BTC", weight: clampW(beta * 55), direction: beta >= 1 ? "+" : "=" },
            { label: "Return z-score", weight: clampW(50 + zscore * 18), direction: zscore >= 0 ? "+" : "-" },
            { label: "Liquidity (24h vol)", weight: clampW(snap.volume24h ? 60 : 40), direction: "=" },
          ],
          supportingNews: [],
          related: [
            { symbol: "BTC", corr: round(0.7, 2) },
          ],
          aiNarrative: `${symbol} is ${change24h >= 0 ? "up" : "down"} ${Math.abs(change24h)}% over 24h with a measured beta-to-BTC of ${beta.toFixed(2)} and a return z-score of ${zscore.toFixed(2)} over the last 24 bars.`,
          candles,
          beta: round(beta, 2),
          zscore: round(zscore, 2),
        };
        return NextResponse.json({
          ok: true,
          data,
          source: "SoSoValue/snapshot + klines (beta/z computed)",
          generatedAt: Date.now(),
        });
      }
    } catch {
      /* fall through to mock */
    }
  }

  return NextResponse.json({
    ok: true,
    data: buildAssetDeepDive(symbol),
    source: "internal/driver-engine (offline preview)",
    generatedAt: Date.now(),
  });
}

// Beta of asset returns vs BTC returns; z-score of the latest asset return.
function betaAndZ(asset: { c: number }[], btc: { c: number }[]) {
  const ar = returns(asset);
  const br = returns(btc);
  const n = Math.min(ar.length, br.length);
  if (n < 2) return { beta: 1, zscore: 0 };
  const a = ar.slice(-n);
  const b = br.slice(-n);
  const meanA = mean(a);
  const meanB = mean(b);
  let cov = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    cov += (a[i] - meanA) * (b[i] - meanB);
    varB += (b[i] - meanB) ** 2;
  }
  const beta = varB > 0 ? cov / varB : 1;
  const sd = Math.sqrt(a.reduce((s, x) => s + (x - meanA) ** 2, 0) / n) || 1e-9;
  const zscore = (a[a.length - 1] - meanA) / sd;
  return { beta, zscore };
}

function returns(k: { c: number }[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < k.length; i++) {
    if (k[i - 1].c) out.push((k[i].c - k[i - 1].c) / k[i - 1].c);
  }
  return out;
}
function mean(x: number[]) {
  return x.length ? x.reduce((s, v) => s + v, 0) / x.length : 0;
}
function clampW(n: number) {
  return Math.max(10, Math.min(92, Math.round(n)));
}
