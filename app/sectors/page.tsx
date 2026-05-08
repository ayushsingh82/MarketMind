"use client";

import MarketMindLayout from "../components/MarketMindLayout";
import Panel from "../components/Panel";
import { useLiveData, formatPct } from "@/lib/useLiveData";
import type { NarrativeMomentum } from "@/lib/types";
import type { SectorSpotlightItem } from "@/lib/sosovalue";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const axis = { tick: { fill: "#71717a", fontSize: 10 }, axisLine: false, tickLine: false };

export default function SectorsPage() {
  const sectors = useLiveData<SectorSpotlightItem[]>("/api/marketmind/sectors", 8000);
  const narratives = useLiveData<NarrativeMomentum[]>("/api/marketmind/narratives", 11000);

  return (
    <MarketMindLayout title="11 · sectors-narratives" subtitle="Leaders · Laggards · Narrative Momentum">
      <Panel
        title="A · sector breadth"
        subtitle="24h leadership map · top gainer / loser per sector"
        status={sectors.status}
        source={sectors.source}
        updatedAt={sectors.updatedAt}
        className="md:col-span-3"
      >
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={sectors.data ?? []}>
            <CartesianGrid stroke="#27272a" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="sector" {...axis} />
            <YAxis {...axis} />
            <Tooltip contentStyle={{ background: "#09090b", border: "1px solid #27272a" }} />
            <Bar dataKey="change24h">
              {(sectors.data ?? []).map((s) => (
                <Cell key={s.sector} fill={s.change24h >= 0 ? "#f97316" : "#52525b"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel
        title="B · sector detail"
        subtitle="Per-sector top gainer + loser"
        status={sectors.status}
        source={sectors.source}
        updatedAt={sectors.updatedAt}
        className="md:col-span-3"
      >
        <ul className="space-y-2 text-xs">
          {(sectors.data ?? []).map((s) => (
            <li key={s.sector} className="rounded-sm border border-zinc-800/80 bg-[#0c0c0e] p-2.5">
              <div className="flex items-baseline justify-between">
                <span className="font-mono uppercase tracking-[0.22em] text-zinc-100">{s.sector}</span>
                <span className={`font-mono tabular-nums ${s.change24h >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {formatPct(s.change24h)}
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-2 text-[11px] text-zinc-500">
                <span>top ↑ <span className="text-emerald-300">{s.topGainer}</span> {formatPct(s.topGainerChange ?? 0)}</span>
                <span>top ↓ <span className="text-rose-300">{s.topLoser}</span> {formatPct(s.topLoserChange ?? 0)}</span>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="C · narrative momentum"
        subtitle="Velocity · breadth · persistence"
        status={narratives.status}
        source={narratives.source}
        updatedAt={narratives.updatedAt}
        className="md:col-span-6"
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(narratives.data ?? []).map((n) => {
            const tone =
              n.state === "peaking"
                ? "text-rose-300 border-rose-400/40"
                : n.state === "accelerating"
                  ? "text-emerald-300 border-emerald-400/40"
                  : n.state === "emerging"
                    ? "text-amber-300 border-amber-400/40"
                    : "text-zinc-400 border-zinc-700";
            return (
              <div key={n.narrative} className={`rounded-sm border bg-[#0c0c0e] p-3 ${tone}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-100">{n.narrative}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em]">{n.state}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-zinc-500">
                  <Stat label="velocity" value={`${n.velocity}`} />
                  <Stat label="breadth" value={`${n.breadth}`} />
                  <Stat label="persistence" value={`${n.persistence}`} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
                  <span>{n.topSymbols.join(" · ")}</span>
                  <span className={n.priceProxy >= 0 ? "text-emerald-300" : "text-rose-300"}>
                    {formatPct(n.priceProxy)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
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
