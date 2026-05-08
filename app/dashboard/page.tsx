"use client";

import MarketMindLayout from "../components/MarketMindLayout";
import Panel from "../components/Panel";
import Pulse from "../components/Pulse";
import { useLiveData, formatPct, formatRelative } from "@/lib/useLiveData";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  Contradiction,
  IntelligenceSummary,
  NarrativeMomentum,
  NewsImpact,
  SentimentPoint,
  SeriesPoint,
} from "@/lib/types";
import type { SectorSpotlightItem } from "@/lib/sosovalue";

type SodexData = {
  flow: {
    symbol: string;
    takerBuyRatio: number;
    spreadBps: number;
    depthImbalance: number;
    netFlow1m: number;
    signal: "absorbing-bids" | "absorbing-offers" | "balanced" | "thin";
    note: string;
  }[];
};

type SsiData = {
  indices: {
    index: string;
    level: number;
    change24h: number;
    drift: number;
    rebalanceWindow: string;
    basket: { symbol: string; weight: number; drift7d: number; contribution24h: number }[];
  }[];
};

const axis = { tick: { fill: "#71717a", fontSize: 10 }, axisLine: false, tickLine: false };

export default function DashboardPage() {
  const summary = useLiveData<IntelligenceSummary>("/api/marketmind/summary", 5000);
  const series = useLiveData<SeriesPoint[]>("/api/marketmind/series", 7000);
  const sentiment = useLiveData<SentimentPoint[]>("/api/marketmind/sentiment", 9000);
  const news = useLiveData<NewsImpact[]>("/api/marketmind/news?limit=6", 12000);
  const contradictions = useLiveData<Contradiction[]>("/api/marketmind/contradictions", 9000);
  const narratives = useLiveData<NarrativeMomentum[]>("/api/marketmind/narratives", 11000);
  const sectors = useLiveData<SectorSpotlightItem[]>("/api/marketmind/sectors", 10000);
  const sodex = useLiveData<SodexData>("/api/marketmind/sodex", 6000);
  const ssi = useLiveData<SsiData>("/api/marketmind/ssi", 13000);

  return (
    <MarketMindLayout title="00 · intelligence-board" subtitle="Cause-Effect Intelligence">
      {/* Pulse rail — single horizontal strip, distinct from AutoFund's KPI grid */}
      <section className="md:col-span-6">
        <div className="flex flex-wrap items-stretch divide-zinc-800/70 rounded-md border border-zinc-800/80 bg-gradient-to-r from-[#0e0e10] to-[#070708]">
          <Pulse
            label="Regime"
            value={summary.data?.regime ?? "—"}
            hint={summary.data ? `confidence ${summary.data.signalConfidence}%` : "loading"}
            tone={summary.data?.regime === "Risk-Off" ? "bad" : summary.data?.regime === "Risk-On" ? "good" : "warn"}
          />
          <Pulse
            label="Macro Risk"
            value={summary.data?.macroRisk ?? "—"}
            hint={summary.data ? `narrative · ${summary.data.topNarrative}` : "loading"}
            tone={
              summary.data?.macroRisk === "High"
                ? "bad"
                : summary.data?.macroRisk === "Elevated"
                  ? "warn"
                  : "default"
            }
          />
          <Pulse
            label="News Velocity"
            value={summary.data?.newsVelocity ?? "—"}
            hint={summary.data ? `Δ24h ${formatPct(summary.data.alpha24h)}` : "loading"}
            tone={summary.data?.newsVelocity === "Surge" ? "good" : "default"}
          />
          <Pulse
            label="Contradictions"
            value={contradictions.data?.length ?? summary.data?.contradictionCount ?? 0}
            hint="cross-source disagreement"
            tone={(contradictions.data?.length ?? 0) > 2 ? "warn" : "default"}
          />
          <Pulse
            label="Narratives"
            value={narratives.data?.length ?? summary.data?.narrativesTracked ?? 0}
            hint="tracked + scored"
          />
          <Pulse
            label="Updated"
            value={summary.data ? formatRelative(summary.updatedAt) : "—"}
            hint={summary.source ?? "session-bound"}
          />
        </div>
      </section>

      {/* Headline impact strip — horizontally scrollable, bento-style */}
      <Panel
        title="A · headline impact strip"
        subtitle="Latest news · measured price reaction · decay half-life"
        status={news.status}
        source={news.source}
        updatedAt={news.updatedAt}
        className="md:col-span-6"
      >
        <div className="-mx-1 flex gap-3 overflow-x-auto pb-1">
          {(news.data ?? []).map((n) => {
            const tone =
              n.sentiment === "bullish" ? "text-emerald-300" : n.sentiment === "bearish" ? "text-rose-300" : "text-zinc-300";
            return (
              <article
                key={n.id}
                className="min-w-[280px] max-w-[320px] flex-shrink-0 rounded-sm border border-zinc-800/80 bg-[#0c0c0e] p-3"
              >
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                  <span>{n.classification}</span>
                  <span className={tone}>{formatPct(n.priceImpactPct)}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-100">{n.title}</p>
                <p className="mt-2 line-clamp-2 text-xs text-zinc-400">{n.aiSummary}</p>
                <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-600">
                  <span>{n.symbols.join(" · ")}</span>
                  <span>τ½ {n.decayHalfLifeMin}m · react {n.reactionWindowMin}m</span>
                </div>
              </article>
            );
          })}
          {!news.data && (
            <div className="min-w-[280px] flex-shrink-0 rounded-sm border border-zinc-800/80 bg-[#0c0c0e] p-3 text-xs text-zinc-500">
              Loading impact deltas…
            </div>
          )}
        </div>
      </Panel>

      {/* Sentiment area chart */}
      <Panel
        title="B · sentiment composition"
        subtitle="Bullish · bearish · neutral, rolling"
        status={sentiment.status}
        source={sentiment.source}
        updatedAt={sentiment.updatedAt}
        className="md:col-span-3"
      >
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={sentiment.data ?? []}>
            <CartesianGrid stroke="#27272a" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="t" {...axis} />
            <YAxis {...axis} />
            <Tooltip contentStyle={{ background: "#09090b", border: "1px solid #27272a" }} />
            <Area type="monotone" dataKey="bull" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.55} />
            <Area type="monotone" dataKey="neutral" stackId="1" stroke="#a1a1aa" fill="#a1a1aa" fillOpacity={0.25} />
            <Area type="monotone" dataKey="bear" stackId="1" stroke="#52525b" fill="#52525b" fillOpacity={0.35} />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      {/* Cross-asset normalized series */}
      <Panel
        title="C · cross-asset normalized"
        subtitle="BTC · ETH · AI · index, rebased"
        status={series.status}
        source={series.source}
        updatedAt={series.updatedAt}
        className="md:col-span-3"
      >
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={series.data ?? []}>
            <CartesianGrid stroke="#27272a" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="t" {...axis} />
            <YAxis {...axis} domain={["dataMin - 1", "dataMax + 1"]} />
            <Tooltip contentStyle={{ background: "#09090b", border: "1px solid #27272a" }} />
            <Line dataKey="btc" stroke="#f97316" dot={false} strokeWidth={2} />
            <Line dataKey="eth" stroke="#fb923c" dot={false} strokeWidth={2} />
            <Line dataKey="ai" stroke="#fdba74" dot={false} strokeWidth={2} />
            <Line dataKey="index" stroke="#71717a" dot={false} strokeWidth={1.5} strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      {/* Narrative momentum stack */}
      <Panel
        title="D · narrative momentum"
        subtitle="Velocity · breadth · persistence"
        status={narratives.status}
        source={narratives.source}
        updatedAt={narratives.updatedAt}
        className="md:col-span-3"
      >
        <ul className="space-y-2">
          {(narratives.data ?? []).slice(0, 6).map((n) => {
            const tone =
              n.state === "peaking"
                ? "text-rose-300"
                : n.state === "accelerating"
                  ? "text-emerald-300"
                  : n.state === "emerging"
                    ? "text-amber-300"
                    : "text-zinc-400";
            return (
              <li key={n.narrative} className="rounded-sm border border-zinc-800/80 bg-[#0c0c0e] p-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-100">{n.narrative}</span>
                  <span className={`font-mono uppercase tracking-[0.2em] ${tone}`}>{n.state}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1">
                  <Bar3 label="vel" v={n.velocity} />
                  <Bar3 label="brd" v={n.breadth} />
                  <Bar3 label="prs" v={n.persistence} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500">
                  <span>{n.topSymbols.join(" · ")}</span>
                  <span className={n.priceProxy >= 0 ? "text-emerald-300" : "text-rose-300"}>
                    {formatPct(n.priceProxy)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      {/* Contradiction stack */}
      <Panel
        title="E · contradiction stack"
        subtitle="When sources disagree, MarketMind says so"
        status={contradictions.status}
        source={contradictions.source}
        updatedAt={contradictions.updatedAt}
        className="md:col-span-3"
      >
        <ul className="space-y-2">
          {(contradictions.data ?? []).slice(0, 4).map((c) => {
            const sev =
              c.severity === "high" ? "text-rose-300" : c.severity === "medium" ? "text-amber-300" : "text-zinc-400";
            return (
              <li key={c.id} className="rounded-sm border border-zinc-800/80 bg-[#0c0c0e] p-2.5">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="line-clamp-2 text-zinc-100">{c.title}</span>
                  <span className={`shrink-0 font-mono uppercase tracking-[0.2em] ${sev}`}>{c.severity}</span>
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-2 text-[10px] text-zinc-500">
                  <span>
                    <span className="text-zinc-400">{c.signalA.label}</span>: {c.signalA.value}
                  </span>
                  <span>
                    <span className="text-zinc-400">{c.signalB.label}</span>: {c.signalB.value}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-400">{c.resolution}</p>
              </li>
            );
          })}
        </ul>
      </Panel>

      {/* Sector breadth bar */}
      <Panel
        title="F · sector breadth"
        subtitle="24h leadership map"
        status={sectors.status}
        source={sectors.source}
        updatedAt={sectors.updatedAt}
        className="md:col-span-3"
      >
        <ResponsiveContainer width="100%" height={180}>
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

      {/* SoDEX microstructure tickers */}
      <Panel
        title="G · SoDEX microstructure"
        subtitle="Spread · taker-buy · depth imbalance · derived signal"
        status={sodex.status}
        source={sodex.source}
        updatedAt={sodex.updatedAt}
        className="md:col-span-3"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="text-left font-mono uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="py-1.5 pr-3">pair</th>
                <th className="py-1.5 pr-3 text-right">spread</th>
                <th className="py-1.5 pr-3 text-right">taker-buy</th>
                <th className="py-1.5 pr-3 text-right">imbalance</th>
                <th className="py-1.5 text-right">signal</th>
              </tr>
            </thead>
            <tbody className="text-zinc-200">
              {(sodex.data?.flow ?? []).map((p) => {
                const tone =
                  p.signal === "absorbing-offers"
                    ? "text-emerald-300"
                    : p.signal === "absorbing-bids"
                      ? "text-rose-300"
                      : p.signal === "thin"
                        ? "text-amber-300"
                        : "text-zinc-400";
                return (
                  <tr key={p.symbol} className="border-t border-zinc-900">
                    <td className="py-1.5 pr-3 font-mono">{p.symbol}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{p.spreadBps.toFixed(1)} bps</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{(p.takerBuyRatio * 100).toFixed(1)}%</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{p.depthImbalance >= 0 ? "+" : ""}{p.depthImbalance.toFixed(2)}</td>
                    <td className={`py-1.5 text-right font-mono uppercase tracking-[0.18em] ${tone}`}>{p.signal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* SSI Index baskets */}
      <Panel
        title="H · SSI Protocol baskets"
        subtitle="Index level · drift · 24h move (read-only research)"
        status={ssi.status}
        source={ssi.source}
        updatedAt={ssi.updatedAt}
        className="md:col-span-6"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {(ssi.data?.indices ?? []).map((idx) => (
            <div key={idx.index} className="rounded-sm border border-zinc-800/80 bg-[#0c0c0e] p-3">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-xs uppercase tracking-[0.22em] text-[#f97316]">{idx.index}</span>
                <span className={`text-sm tabular-nums ${idx.change24h >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {formatPct(idx.change24h)}
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between text-[11px] text-zinc-500">
                <span>level {idx.level.toFixed(2)}</span>
                <span>drift {idx.drift.toFixed(2)} · {idx.rebalanceWindow}</span>
              </div>
              <ul className="mt-2 space-y-1 text-[11px] text-zinc-300">
                {idx.basket.map((b) => (
                  <li key={b.symbol} className="flex items-center justify-between font-mono">
                    <span>{b.symbol}</span>
                    <span className="flex items-center gap-2 text-zinc-500">
                      <span className="tabular-nums text-zinc-400">{b.weight}%</span>
                      <span className={`tabular-nums ${b.contribution24h >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {formatPct(b.contribution24h)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>
    </MarketMindLayout>
  );
}

function Bar3({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-500">
      <span className="w-6 uppercase tracking-wider">{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full bg-gradient-to-r from-[#f97316]/40 via-[#f97316]/80 to-[#f97316]"
          style={{ width: `${Math.max(2, Math.min(100, v))}%` }}
        />
      </div>
      <span className="w-6 text-right tabular-nums text-zinc-400">{v}</span>
    </div>
  );
}
