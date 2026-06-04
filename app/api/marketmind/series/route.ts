import { NextResponse } from "next/server";
import { buildSeries } from "@/lib/mock";
import { getKlines, getSectorSpotlight, hasSosoKey } from "@/lib/sosovalue";
import type { SeriesPoint } from "@/lib/types";

export const runtime = "nodejs";
export const revalidate = 0;

// Cross-asset normalized series.
// Live: rebase BTC + ETH klines to 100 at the window start; the "ai" line tracks
// ETH-relative beta scaled by AI-sector 24h move, and "index" is the blended
// average. Sentiment is a smoothed function of the rolling BTC return.
// No key → deterministic mock.

function rebaseClose(klines: { t: number; c: number }[], points: number): { t: number; v: number }[] {
  if (!klines.length) return [];
  const sorted = [...klines].sort((a, b) => a.t - b.t).slice(-points);
  const base = sorted[0].c || 1;
  return sorted.map((k) => ({ t: k.t, v: (k.c / base) * 100 }));
}

export async function GET() {
  if (hasSosoKey()) {
    try {
      const points = 36;
      const [btcK, ethK, sectors] = await Promise.all([
        getKlines("BTC", "1h", points).catch(() => ({ data: [] })),
        getKlines("ETH", "1h", points).catch(() => ({ data: [] })),
        getSectorSpotlight().catch(() => ({ data: [] })),
      ]);
      const btc = rebaseClose(btcK.data, points);
      const eth = rebaseClose(ethK.data, points);

      if (btc.length >= 3 && eth.length >= 3) {
        const n = Math.min(btc.length, eth.length);
        const aiSector = (sectors.data ?? []).find((s) => /ai/i.test(s.sector));
        const aiTilt = 1 + (aiSector?.change24h ?? 0) / 100;
        const out: SeriesPoint[] = [];
        for (let i = 0; i < n; i++) {
          const b = btc[btc.length - n + i].v;
          const e = eth[eth.length - n + i].v;
          // AI proxy: amplify ETH deviation from 100 by the AI-sector tilt.
          const ai = 100 + (e - 100) * 1.4 * aiTilt;
          const index = (b + e + ai) / 3;
          const ret = i > 0 ? b - 100 : 0;
          const sentiment = Math.max(18, Math.min(86, 52 + ret * 1.5));
          const ts = btc[btc.length - n + i].t;
          out.push({
            t: new Date(ts).toISOString().slice(11, 16),
            ts,
            btc: round(b),
            eth: round(e),
            ai: round(ai),
            index: round(index),
            sentiment: round(sentiment, 1),
          });
        }
        return NextResponse.json({
          ok: true,
          data: out,
          source: "SoSoValue/klines (BTC+ETH rebased) + sector tilt",
          generatedAt: Date.now(),
        });
      }
    } catch {
      /* fall through to mock */
    }
  }

  return NextResponse.json({
    ok: true,
    data: buildSeries(36),
    source: "internal/normalizer (offline preview)",
    generatedAt: Date.now(),
  });
}

function round(n: number, p = 2) {
  const m = 10 ** p;
  return Math.round(n * m) / m;
}
