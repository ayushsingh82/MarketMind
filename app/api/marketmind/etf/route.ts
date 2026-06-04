import { NextResponse } from "next/server";
import { getEtfFlows, hasSosoKey } from "@/lib/sosovalue";
import { round } from "@/lib/analytics";

export const runtime = "nodejs";
export const revalidate = 0;

// ETF flow intelligence — /etfs/summary-history.
// Real net inflows/outflows (USD; negative = outflow) for spot BTC/ETH ETFs.
// Feeds the dashboard flow panel + the contradiction / narrative engines.
// No SoSoValue key → deterministic mock series so the panel still renders.

type FlowPoint = { date: string; netInflow: number; cumInflow: number };
type EtfSummary = {
  symbol: string;
  label: string;
  latestNetInflow: number;
  cum5d: number;
  streak: number; // consecutive same-sign days from the latest
  series: FlowPoint[];
};

const TARGETS: { symbol: string; label: string }[] = [
  { symbol: "us-btc-spot", label: "Spot BTC ETF" },
  { symbol: "us-eth-spot", label: "Spot ETH ETF" },
];

function mockSeries(seed: number): FlowPoint[] {
  // Deterministic, day-bucketed pseudo flows.
  const out: FlowPoint[] = [];
  let cum = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const x = Math.sin((seed + i) * 1.7) * 320_000_000;
    const net = round(x, 0);
    cum = round(cum + net, 0);
    out.push({ date: d.toISOString().slice(0, 10), netInflow: net, cumInflow: cum });
  }
  return out;
}

function summarize(symbol: string, label: string, series: FlowPoint[]): EtfSummary {
  const latest = series[series.length - 1];
  const cum5d = round(series.slice(-5).reduce((s, p) => s + p.netInflow, 0), 0);
  let streak = 0;
  const sign = Math.sign(latest?.netInflow ?? 0);
  for (let i = series.length - 1; i >= 0; i--) {
    if (Math.sign(series[i].netInflow) === sign && sign !== 0) streak += 1;
    else break;
  }
  return { symbol, label, latestNetInflow: latest?.netInflow ?? 0, cum5d, streak: sign >= 0 ? streak : -streak, series };
}

export async function GET() {
  if (hasSosoKey()) {
    try {
      const results = await Promise.all(
        TARGETS.map(async (t) => {
          const res = await getEtfFlows(t.symbol, 7);
          const series: FlowPoint[] = (res.data ?? []).map((f) => ({
            date: f.date,
            netInflow: f.totalNetInflow,
            cumInflow: f.cumNetInflow ?? 0,
          }));
          return summarize(t.symbol, t.label, series.length ? series : mockSeries(t.symbol.length));
        }),
      );
      const anyLive = results.some((r) => r.series.length > 0);
      return NextResponse.json({
        ok: true,
        data: results,
        source: anyLive ? "SoSoValue/etfs/summary-history (live)" : "ETF flows (empty → mock)",
        generatedAt: Date.now(),
      });
    } catch (err) {
      return NextResponse.json({
        ok: true,
        data: TARGETS.map((t, i) => summarize(t.symbol, t.label, mockSeries(i + 1))),
        source: `ETF flows (fallback: ${(err as Error).message.slice(0, 60)})`,
        generatedAt: Date.now(),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    data: TARGETS.map((t, i) => summarize(t.symbol, t.label, mockSeries(i + 1))),
    source: "ETF flows (offline preview)",
    generatedAt: Date.now(),
  });
}
