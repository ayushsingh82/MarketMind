"use client";

import Panel from "./Panel";
import { useLiveData, formatRelative } from "@/lib/useLiveData";

type Brief = { brief: string; live: boolean };

export default function AIBriefCard({ className }: { className?: string }) {
  // Polled slowly — the route caches the generated brief server-side for ~90s.
  const { data, status, source, updatedAt } = useLiveData<Brief>("/api/marketmind/brief", 60_000);

  return (
    <Panel
      title="AI Market Brief"
      subtitle={data?.live ? "live model · grounded in current feeds" : "grounded read of the tape"}
      status={status}
      source={source}
      updatedAt={updatedAt}
      className={className}
    >
      <p className="leading-relaxed text-zinc-200">
        {data?.brief ?? "Reading the tape from the current news, sector, macro and market feeds…"}
      </p>
      <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
        <span>{data?.live ? "vLLM · Qwen3-VL" : status === "loading" ? "…" : "heuristic"}</span>
        <span>{updatedAt ? formatRelative(updatedAt) : ""}</span>
      </div>
    </Panel>
  );
}
