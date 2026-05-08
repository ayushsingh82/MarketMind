import { NextResponse } from "next/server";
import { buildSsiIndices } from "@/lib/mock";
import { getIndexMarketSnapshot, hasSosoKey } from "@/lib/sosovalue";

export const runtime = "nodejs";
export const revalidate = 0;

// SSI Protocol = SoSoValue's on-chain spot index protocol.
// MarketMind surfaces SSI baskets + drift as research context. We never
// rebalance — we explain what the index is doing and why.

export async function GET() {
  const fallback = buildSsiIndices();

  if (hasSosoKey()) {
    try {
      const live = await getIndexMarketSnapshot();
      const livePoints = live.data?.length ?? 0;
      return NextResponse.json({
        ok: true,
        data: {
          indices: fallback,
          livePoints,
        },
        source: "SoSoValue/index-market-snapshot + internal/basket-explainer",
        generatedAt: Date.now(),
      });
    } catch (err) {
      return NextResponse.json({
        ok: true,
        data: { indices: fallback, livePoints: 0 },
        source: `SSI (fallback: ${(err as Error).message.slice(0, 80)})`,
        generatedAt: Date.now(),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    data: { indices: fallback, livePoints: 0 },
    source: "SSI Protocol (offline preview)",
    generatedAt: Date.now(),
  });
}
