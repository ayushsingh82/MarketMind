"use client";

import MarketMindLayout from "../components/MarketMindLayout";
import Panel from "../components/Panel";
import { useLiveData, formatPct } from "@/lib/useLiveData";
import type { WatchlistItem } from "@/lib/types";

const TONE: Record<WatchlistItem["riskTone"], string> = {
  calm: "border-emerald-400/40 text-emerald-300",
  watch: "border-amber-400/40 text-amber-300",
  alert: "border-rose-400/40 text-rose-300",
};

export default function WatchlistPage() {
  const data = useLiveData<WatchlistItem[]>("/api/marketmind/watchlist", 8000);

  return (
    <MarketMindLayout title="22 · watchlist" subtitle="Saved assets · thesis · risk tone">
      <Panel
        title="A · watchlist"
        subtitle="Each row carries why-it-matters context"
        status={data.status}
        source={data.source}
        updatedAt={data.updatedAt}
        className="md:col-span-6"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {(data.data ?? []).map((w) => (
            <article key={w.symbol} className={`rounded-sm border bg-[#0c0c0e] p-3 ${TONE[w.riskTone]}`}>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-base tracking-wider text-zinc-100">{w.symbol}</span>
                <span className={`tabular-nums ${w.priceChange24h >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {formatPct(w.priceChange24h)}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-zinc-300">{w.thesis}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-zinc-500">
                <span>β <span className="text-zinc-300">{w.beta.toFixed(2)}</span></span>
                <span>tone <span className="text-zinc-300">{w.riskTone}</span></span>
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-500">{w.exposureNote}</p>
            </article>
          ))}
        </div>
      </Panel>
    </MarketMindLayout>
  );
}
