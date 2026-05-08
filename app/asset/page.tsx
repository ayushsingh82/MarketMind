"use client";

import { useState } from "react";
import MarketMindLayout from "../components/MarketMindLayout";
import Panel from "../components/Panel";
import { useLiveData, formatPct } from "@/lib/useLiveData";
import type { AssetDeepDive } from "@/lib/types";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SYMBOLS = ["ETH", "BTC", "SOL"];
const axis = { tick: { fill: "#71717a", fontSize: 10 }, axisLine: false, tickLine: false };

export default function AssetPage() {
  const [symbol, setSymbol] = useState("ETH");
  const asset = useLiveData<AssetDeepDive>(`/api/marketmind/asset?symbol=${symbol}`, 7000);

  return (
    <MarketMindLayout title="20 · asset-deepdive" subtitle="Drivers · Related · AI Narrative">
      <Panel
        title="A · asset"
        subtitle={asset.data ? `${asset.data.symbol} · ${asset.data.price.toFixed(2)} · ${formatPct(asset.data.change24h)}` : "loading"}
        status={asset.status}
        source={asset.source}
        updatedAt={asset.updatedAt}
        className="md:col-span-6"
      >
        <div className="flex flex-wrap gap-2">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.22em] transition ${
                symbol === s
                  ? "border-[#f97316] bg-[#f97316] text-black"
                  : "border-zinc-800 bg-[#0c0c0e] text-zinc-400 hover:border-[#f97316]"
              }`}
            >
              {s}
            </button>
          ))}
          <span className="ml-auto self-center font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
            β {asset.data?.beta.toFixed(2) ?? "—"} · z {asset.data?.zscore.toFixed(2) ?? "—"}
          </span>
        </div>
      </Panel>

      <Panel
        title="B · price path"
        subtitle="24h close-by-close"
        status={asset.status}
        source={asset.source}
        updatedAt={asset.updatedAt}
        className="md:col-span-4"
      >
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={asset.data?.candles ?? []}>
            <CartesianGrid stroke="#27272a" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="t" {...axis} />
            <YAxis {...axis} domain={["dataMin - 5", "dataMax + 5"]} />
            <Tooltip contentStyle={{ background: "#09090b", border: "1px solid #27272a" }} />
            <Line dataKey="c" stroke="#f97316" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      <Panel
        title="C · drivers"
        subtitle="Weight + direction per signal"
        status={asset.status}
        source={asset.source}
        updatedAt={asset.updatedAt}
        className="md:col-span-2"
      >
        <ul className="space-y-1.5 text-[12px]">
          {(asset.data?.drivers ?? []).map((d) => (
            <li key={d.label} className="rounded-sm border border-zinc-800 bg-[#0c0c0e] p-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-200">{d.label}</span>
                <span className="font-mono text-[#f97316]">{d.direction}</span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#f97316]/40 to-[#f97316]"
                  style={{ width: `${Math.max(2, Math.min(100, d.weight))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="D · AI narrative" subtitle="Plain-language read" className="md:col-span-4">
        <p className="text-[13px] leading-7 text-zinc-200">
          {asset.data?.aiNarrative ?? "Loading narrative…"}
        </p>
      </Panel>

      <Panel title="E · related assets" subtitle="Correlation > 0.4" className="md:col-span-2">
        <ul className="space-y-1.5 text-[12px]">
          {(asset.data?.related ?? []).map((r) => (
            <li key={r.symbol} className="flex items-center justify-between rounded-sm border border-zinc-800 bg-[#0c0c0e] p-2 font-mono">
              <span className="text-zinc-200">{r.symbol}</span>
              <span className="tabular-nums text-zinc-400">ρ {r.corr.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="F · supporting news"
        subtitle="Cited headlines feeding the read"
        className="md:col-span-6"
      >
        <ul className="space-y-1.5 text-[12px] text-zinc-300">
          {(asset.data?.supportingNews ?? []).map((s, i) => (
            <li key={i} className="rounded-sm border border-zinc-800 bg-[#0c0c0e] p-2">
              <span className="text-[#f97316]">› </span>
              {s}
            </li>
          ))}
        </ul>
      </Panel>
    </MarketMindLayout>
  );
}
