"use client";

import MarketMindLayout from "../components/MarketMindLayout";
import Panel from "../components/Panel";
import { useLiveData, formatPct } from "@/lib/useLiveData";

type SsiData = {
  indices: {
    index: string;
    level: number;
    change24h: number;
    drift: number;
    rebalanceWindow: string;
    basket: { symbol: string; weight: number; drift7d: number; contribution24h: number }[];
  }[];
  livePoints: number;
};

export default function SsiPage() {
  const ssi = useLiveData<SsiData>("/api/marketmind/ssi", 11000);

  return (
    <MarketMindLayout title="14 · ssi-protocol" subtitle="Index Baskets · Drift · Contribution (read-only)">
      {(ssi.data?.indices ?? []).map((idx, i) => (
        <Panel
          key={idx.index}
          title={`${(i + 1).toString().padStart(1, "0")}${i + 1} · ${idx.index}`}
          subtitle={`level ${idx.level.toFixed(2)} · drift ${idx.drift.toFixed(2)} · rebalance ${idx.rebalanceWindow}`}
          status={ssi.status}
          source={ssi.source}
          updatedAt={ssi.updatedAt}
          className="md:col-span-2"
        >
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-zinc-500">24h</span>
            <span className={`text-2xl font-semibold tabular-nums ${idx.change24h >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {formatPct(idx.change24h)}
            </span>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs">
            {idx.basket.map((b) => (
              <li key={b.symbol} className="flex items-center justify-between font-mono">
                <span className="text-zinc-100">{b.symbol}</span>
                <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                  <span className="tabular-nums text-zinc-400">w {b.weight}%</span>
                  <span className={`tabular-nums ${b.drift7d >= 0 ? "text-amber-300" : "text-zinc-500"}`}>
                    drift {formatPct(b.drift7d, 2)}
                  </span>
                  <span className={`tabular-nums ${b.contribution24h >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {formatPct(b.contribution24h)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ))}

      <Panel
        title="Z · what these tell you"
        subtitle="Read-only research context"
        className="md:col-span-6"
      >
        <p className="text-[12px] text-zinc-300">
          MarketMind surfaces SSI baskets as research context. The contribution column shows
          how much each constituent is moving the index today, and the drift column shows how
          far each weight has drifted vs. its target since last rebalance. MarketMind never
          rebalances the basket — that's an executor's job. The dashboard exists so a user
          can see, in one panel, whether the index move is concentrated or broad-based and
          whether a rebalance window is approaching.
        </p>
      </Panel>
    </MarketMindLayout>
  );
}
