"use client";

import { ReactNode } from "react";

type PulseProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
};

const TONE: Record<NonNullable<PulseProps["tone"]>, string> = {
  default: "text-zinc-100",
  good: "text-emerald-300",
  warn: "text-amber-300",
  bad: "text-rose-300",
};

// Compact intelligence chip — used in the dashboard pulse rail.
// Not a card: it's a vertical-divider stack so the dashboard reads as a strip,
// not a KPI grid (different from AutoFund's corner-bracket KPICards).

export default function Pulse({ label, value, hint, tone = "default" }: PulseProps) {
  return (
    <div className="flex flex-1 flex-col gap-1 border-r border-zinc-800/70 px-5 py-3 last:border-r-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">{label}</span>
      <span className={`text-2xl font-semibold tabular-nums ${TONE[tone]}`}>{value}</span>
      {hint ? <span className="text-[11px] text-zinc-500">{hint}</span> : null}
    </div>
  );
}
