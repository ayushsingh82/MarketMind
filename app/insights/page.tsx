"use client";

import MarketMindLayout from "../components/MarketMindLayout";
import Panel from "../components/Panel";
import { useLiveData, formatRelative } from "@/lib/useLiveData";
import type { AlertItem, PersonalInsight } from "@/lib/types";

type InsightsData = { insights: PersonalInsight[]; alerts: AlertItem[] };

const SEV_TONE: Record<AlertItem["severity"], string> = {
  info: "border-zinc-700 text-zinc-300",
  watch: "border-amber-400/40 text-amber-300",
  warn: "border-orange-400/40 text-orange-300",
  critical: "border-rose-400/40 text-rose-300",
};

export default function InsightsPage() {
  const data = useLiveData<InsightsData>("/api/marketmind/insights", 9000);

  return (
    <MarketMindLayout title="21 · personal-insights" subtitle="Watchlist-aware reasoning + alerts">
      <Panel
        title="A · insights for you"
        subtitle="Each insight is grounded in cited evidence"
        status={data.status}
        source={data.source}
        updatedAt={data.updatedAt}
        className="md:col-span-4"
      >
        <ul className="space-y-3">
          {(data.data?.insights ?? []).map((ins) => (
            <li key={ins.id} className="rounded-sm border border-zinc-800/80 bg-[#0c0c0e] p-3">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                <span className="font-mono text-[#f97316]">{ins.symbol ?? "–"}</span>
                <span>conf {ins.confidence}% · {formatRelative(ins.generatedAt)}</span>
              </div>
              <p className="mt-1.5 text-sm text-zinc-100">{ins.title}</p>
              <p className="mt-1 text-[12px] leading-5 text-zinc-400">{ins.body}</p>
              <ul className="mt-2 space-y-0.5 text-[11px] text-zinc-500">
                {ins.evidence.map((e) => (
                  <li key={e} className="flex gap-2">
                    <span className="text-[#f97316]">·</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="B · alert feed"
        subtitle="Risk · sector · macro · narrative"
        status={data.status}
        source={data.source}
        updatedAt={data.updatedAt}
        className="md:col-span-2"
      >
        <ul className="space-y-2">
          {(data.data?.alerts ?? []).map((a) => (
            <li key={a.id} className={`rounded-sm border bg-[#0c0c0e] p-2.5 ${SEV_TONE[a.severity]}`}>
              <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.22em]">
                <span>{a.category}</span>
                <span>{formatRelative(a.ts)}</span>
              </div>
              <p className="mt-1 text-[12px]">{a.message}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </MarketMindLayout>
  );
}
