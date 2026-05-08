"use client";

import { formatRelative } from "@/lib/useLiveData";

type StatusDotProps = {
  status: "loading" | "live" | "stale" | "error";
  source?: string;
  updatedAt?: number;
};

const TONE: Record<StatusDotProps["status"], string> = {
  loading: "bg-zinc-500",
  live: "bg-emerald-400",
  stale: "bg-amber-400",
  error: "bg-rose-500",
};

const LABEL: Record<StatusDotProps["status"], string> = {
  loading: "loading",
  live: "live",
  stale: "stale",
  error: "error",
};

export default function StatusDot({ status, source, updatedAt }: StatusDotProps) {
  return (
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${TONE[status]} ${status === "live" ? "animate-pulse" : ""}`} />
      <span className="text-zinc-400">{LABEL[status]}</span>
      {source ? <span className="text-zinc-600">·</span> : null}
      {source ? <span className="truncate text-zinc-500">{source}</span> : null}
      {updatedAt ? <span className="text-zinc-600">·</span> : null}
      {updatedAt ? <span className="text-zinc-500">{formatRelative(updatedAt)}</span> : null}
    </div>
  );
}
