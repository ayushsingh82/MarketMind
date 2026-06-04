import { NextResponse } from "next/server";
import { buildMarketMindIndex } from "@/lib/ssi";
import { detectContradictions } from "@/lib/marketmind";

export const runtime = "nodejs";
export const revalidate = 0;

// "Send to AutoFund" handoff.
//
// Emits a self-contained, structured signal object that a sister executor
// (AutoFund AI) could consume to act on. MarketMind itself NEVER executes — this
// is purely a read-only intent payload: the MarketMind Index target weights,
// the engine's conviction score, and the active cross-source contradiction flag.
// No runtime dependency on the other repo; the JSON is copyable / downloadable.

export async function GET() {
  const [mmx, contra] = await Promise.all([buildMarketMindIndex(), detectContradictions()]);

  const activeContradiction = contra.items.length > 0;
  const highSeverity = contra.items.some((c) => c.severity === "high");

  const signal = {
    schema: "marketmind.autofund.signal/v1",
    generatedAt: Date.now(),
    issuer: "MarketMind (read-only intelligence)",
    note: "MarketMind does not execute. This is an advisory target for an external executor.",
    index: {
      ticker: mmx.ticker,
      name: mmx.name,
      methodology: mmx.methodology,
      targetWeights: mmx.constituents.map((c) => ({ symbol: c.symbol, weight: c.targetWeight })),
      lastRebalanced: mmx.lastRebalanced,
    },
    conviction: {
      score: mmx.convictionScore, // 0..100
      navChange24h: mmx.change24h,
    },
    riskFlags: {
      activeContradiction,
      highSeverityContradiction: highSeverity,
      contradictionCount: contra.items.length,
      // Gate hint for the executor: hold sizing while a high-severity cross-source
      // disagreement is live.
      recommendedAction: highSeverity ? "hold" : activeContradiction ? "scale-cautiously" : "proceed",
      contradictions: contra.items.map((c) => ({
        title: c.title,
        severity: c.severity,
        a: `${c.signalA.label}: ${c.signalA.value} (${c.signalA.source})`,
        b: `${c.signalB.label}: ${c.signalB.value} (${c.signalB.source})`,
      })),
    },
    sources: { index: mmx.source, contradictions: contra.source },
  };

  return NextResponse.json(
    { ok: true, data: signal, source: "marketmind/autofund-handoff", generatedAt: Date.now() },
    {
      headers: {
        // Make it trivially downloadable from the browser.
        "Content-Disposition": "inline; filename=marketmind-autofund-signal.json",
      },
    },
  );
}
