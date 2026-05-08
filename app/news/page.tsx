"use client";

import MarketMindLayout from "../components/MarketMindLayout";
import Panel from "../components/Panel";
import { useLiveData, formatPct, formatRelative } from "@/lib/useLiveData";
import type { NewsImpact } from "@/lib/types";

const SENT_TONE: Record<NewsImpact["sentiment"], string> = {
  bullish: "text-emerald-300 border-emerald-400/40",
  bearish: "text-rose-300 border-rose-400/40",
  neutral: "text-zinc-300 border-zinc-700",
};

export default function NewsPage() {
  const news = useLiveData<NewsImpact[]>("/api/marketmind/news?limit=10", 9000);

  return (
    <MarketMindLayout title="10 · news-impact" subtitle="Headlines with measured price reaction">
      <Panel
        title="A · impact feed"
        subtitle="Reaction window · decay half-life · classification"
        status={news.status}
        source={news.source}
        updatedAt={news.updatedAt}
        className="md:col-span-6"
      >
        <ul className="space-y-2">
          {(news.data ?? []).map((n) => (
            <li key={n.id} className={`rounded-sm border bg-[#0c0c0e] p-3 ${SENT_TONE[n.sentiment]}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-zinc-100">{n.title}</p>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em]">
                  {n.classification}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-zinc-400">{n.aiSummary}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-zinc-500 md:grid-cols-5">
                <Stat label="impact" value={formatPct(n.priceImpactPct)} />
                <Stat label="react" value={`${n.reactionWindowMin}m`} />
                <Stat label="τ½" value={`${n.decayHalfLifeMin}m`} />
                <Stat label="conviction" value={`${n.conviction}`} />
                <Stat label="when" value={formatRelative(n.publishedAt)} />
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-zinc-500">
                {n.symbols.map((s) => (
                  <span key={s} className="rounded-sm border border-zinc-800 px-1.5 py-0.5 font-mono">
                    {s}
                  </span>
                ))}
                <span className="ml-auto text-zinc-600">{n.source}</span>
              </div>
            </li>
          ))}
          {!news.data ? <li className="text-[12px] text-zinc-500">Loading impact-scored headlines…</li> : null}
        </ul>
      </Panel>
    </MarketMindLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-500">{label}</span>
      <span className="text-zinc-200 tabular-nums">{value}</span>
    </div>
  );
}
