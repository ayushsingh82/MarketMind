"use client";

import { ReactNode } from "react";
import StatusDot from "./StatusDot";

type PanelProps = {
  title: string;
  subtitle?: string;
  status?: "loading" | "live" | "stale" | "error";
  source?: string;
  updatedAt?: number;
  className?: string;
  children: ReactNode;
};

// Panel intentionally avoids the corner-bracket motif used in AutoFund.
// MarketMind uses a left-rail accent + soft underline divider for its
// own visual language.

export default function Panel({
  title,
  subtitle,
  status,
  source,
  updatedAt,
  className,
  children,
}: PanelProps) {
  return (
    <section
      className={`group relative overflow-hidden rounded-md border border-zinc-800/80 bg-gradient-to-b from-[#0e0e10] to-[#070708] p-5 shadow-[0_0_0_1px_rgba(249,115,22,0.04)_inset] ${
        className ?? ""
      }`}
    >
      <div className="pointer-events-none absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-[#f97316]/0 via-[#f97316]/60 to-[#f97316]/0" />
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-800/70 pb-3">
        <div className="min-w-0">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#f97316]">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-zinc-500">{subtitle}</p> : null}
        </div>
        {status ? <StatusDot status={status} source={source} updatedAt={updatedAt} /> : null}
      </header>
      <div className="mt-4 text-sm text-zinc-200">{children}</div>
    </section>
  );
}
