import { NextResponse } from "next/server";
import { buildStakingYields } from "@/lib/mock";

export const runtime = "nodejs";
export const revalidate = 0;

// Staking yield context — surfaces where current real yields sit and how they
// shifted, so MarketMind can flag yield-vs-risk regime divergence.

export async function GET() {
  const yields = buildStakingYields();
  const blendedApy = round(
    yields.reduce((s, y) => s + y.apy, 0) / Math.max(1, yields.length),
    2,
  );
  const elevatedShare = round(
    yields.filter((y) => y.riskTier === "elevated").length / yields.length,
    2,
  );
  return NextResponse.json({
    ok: true,
    data: {
      yields,
      blendedApy,
      elevatedShare,
      note:
        elevatedShare > 0.4
          ? "Yield curve is dominated by elevated-risk venues — yield ≠ free, factor smart-contract + restaking risk."
          : "Yield landscape is balanced across risk tiers; rotation between low/moderate is the cleanest add.",
    },
    source: "internal/staking-aggregator + SoSoValue",
    generatedAt: Date.now(),
  });
}

function round(n: number, places = 2) {
  const m = 10 ** places;
  return Math.round(n * m) / m;
}
