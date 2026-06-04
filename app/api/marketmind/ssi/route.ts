import { NextResponse } from "next/server";
import { buildLiveSsiIndices, buildMarketMindIndex } from "@/lib/ssi";

export const runtime = "nodejs";
export const revalidate = 0;

// SSI Protocol = SoSoValue's on-chain spot index protocol.
// MarketMind surfaces SSI baskets + drift as research context (read-only) and
// publishes its OWN computed methodology index (MMX) alongside for comparison.
// We never rebalance an on-chain index — we explain and we compute.

export async function GET() {
  const [ssi, mmx] = await Promise.all([buildLiveSsiIndices(), buildMarketMindIndex()]);

  return NextResponse.json({
    ok: true,
    data: {
      indices: ssi.indices,
      livePoints: ssi.livePoints,
      mmx,
    },
    source: `${ssi.source}; ${mmx.source}`,
    generatedAt: Date.now(),
  });
}
