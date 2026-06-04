"use client";

import { useState } from "react";
import MarketMindLayout from "../components/MarketMindLayout";
import Panel from "../components/Panel";
import { useLiveData, formatPct } from "@/lib/useLiveData";

type MmxConstituent = {
  symbol: string;
  targetWeight: number;
  rawMarketCapWeight: number;
  price: number;
  change24h: number;
  contribution24h: number;
};

type Mmx = {
  name: string;
  ticker: string;
  methodology: { universe: string; weighting: string; singleNameCap: number; rebalance: string };
  lastRebalanced: number;
  nav: number;
  change24h: number;
  constituents: MmxConstituent[];
  convictionScore: number;
  source: string;
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
  livePoints: number;
  mmx: Mmx;
};

export default function SsiPage() {
  const ssi = useLiveData<SsiData>("/api/marketmind/ssi", 11000);
  const mmx = ssi.data?.mmx;
  const [handoff, setHandoff] = useState<string | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<"idle" | "loading" | "done">("idle");

  async function sendToAutoFund() {
    setHandoffStatus("loading");
    try {
      const res = await fetch("/api/marketmind/autofund", { cache: "no-store" });
      const json = await res.json();
      setHandoff(JSON.stringify(json.data, null, 2));
      setHandoffStatus("done");
    } catch {
      setHandoffStatus("idle");
    }
  }

  function downloadSignal() {
    if (!handoff) return;
    const blob = new Blob([handoff], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "marketmind-autofund-signal.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <MarketMindLayout title="14 · ssi-protocol" subtitle="MarketMind Index · SSI Baskets · Drift (read-only)">
      {/* MarketMind Index — the published, computed methodology index */}
      <Panel
        title="00 · MarketMind Index (MMX)"
        subtitle={mmx ? `NAV ${mmx.nav.toFixed(2)} · conviction ${mmx.convictionScore}/100` : "computing…"}
        status={ssi.status}
        source={ssi.source}
        updatedAt={ssi.updatedAt}
        className="md:col-span-4"
      >
        {mmx ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">24h</span>
              <span className={`text-2xl font-semibold tabular-nums ${mmx.change24h >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {formatPct(mmx.change24h)}
              </span>
            </div>
            <table className="mt-3 w-full font-mono text-[11px]">
              <thead className="text-left text-[9px] uppercase tracking-[0.2em] text-zinc-500">
                <tr>
                  <th className="pb-1">name</th>
                  <th className="pb-1 text-right">weight</th>
                  <th className="pb-1 text-right">raw mcap</th>
                  <th className="pb-1 text-right">24h</th>
                  <th className="pb-1 text-right">contrib</th>
                </tr>
              </thead>
              <tbody>
                {mmx.constituents.map((c) => (
                  <tr key={c.symbol} className="border-t border-zinc-900">
                    <td className="py-0.5 text-zinc-100">{c.symbol}</td>
                    <td className="py-0.5 text-right tabular-nums text-[#f97316]">{c.targetWeight.toFixed(1)}%</td>
                    <td className="py-0.5 text-right tabular-nums text-zinc-500">{c.rawMarketCapWeight.toFixed(1)}%</td>
                    <td className={`py-0.5 text-right tabular-nums ${c.change24h >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {formatPct(c.change24h)}
                    </td>
                    <td className={`py-0.5 text-right tabular-nums ${c.contribution24h >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {formatPct(c.contribution24h)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-xs text-zinc-500">Computing index NAV…</p>
        )}
      </Panel>

      {/* Methodology + AutoFund handoff */}
      <Panel
        title="01 · methodology + handoff"
        subtitle="Computed, published — not an on-chain mint"
        className="md:col-span-2"
      >
        {mmx ? (
          <ul className="space-y-1.5 text-[11px] text-zinc-300">
            <li><span className="text-zinc-500">universe</span> · {mmx.methodology.universe}</li>
            <li><span className="text-zinc-500">weighting</span> · {mmx.methodology.weighting}</li>
            <li><span className="text-zinc-500">single-name cap</span> · {mmx.methodology.singleNameCap}%</li>
            <li><span className="text-zinc-500">rebalance</span> · {mmx.methodology.rebalance}</li>
            <li>
              <span className="text-zinc-500">last rebalanced</span> ·{" "}
              {new Date(mmx.lastRebalanced).toISOString().slice(0, 10)}
            </li>
          </ul>
        ) : null}
        <p className="mt-3 text-[10px] leading-4 text-zinc-500">
          MMX is a transparently computed basket published for comparison against on-chain SSI
          indices. MarketMind does not mint on-chain indices (committee-gated) and does not execute.
        </p>
        <button
          onClick={sendToAutoFund}
          disabled={handoffStatus === "loading"}
          className="mt-3 w-full rounded-sm border border-[#f97316] bg-[#f97316] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-[#fb923c] disabled:opacity-50"
        >
          {handoffStatus === "loading" ? "building signal…" : "Send to AutoFund →"}
        </button>
        {handoff ? (
          <button
            onClick={downloadSignal}
            className="mt-2 w-full rounded-sm border border-zinc-700 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-zinc-300 transition hover:border-[#f97316]"
          >
            download signal.json
          </button>
        ) : null}
      </Panel>

      {handoff ? (
        <Panel title="02 · autofund signal payload" subtitle="Structured, copyable handoff (read-only intent)" className="md:col-span-6">
          <pre className="max-h-72 overflow-auto rounded-sm border border-zinc-800 bg-[#0a0a0c] p-3 font-mono text-[10px] leading-4 text-emerald-200">
            {handoff}
          </pre>
        </Panel>
      ) : null}

      {/* SSI baskets (live constituents + 24h contribution + NAV) */}
      {(ssi.data?.indices ?? []).map((idx, i) => (
        <Panel
          key={idx.index}
          title={`1${i + 1} · ${idx.index}`}
          subtitle={`level ${idx.level.toFixed(2)} · drift ${idx.drift.toFixed(2)} · rebalance ${idx.rebalanceWindow}`}
          status={ssi.status}
          source={ssi.source}
          updatedAt={ssi.updatedAt}
          className="md:col-span-2"
        >
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-zinc-500">24h</span>
            <span className={`text-2xl font-semibold tabular-nums ${idx.change24h >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {formatPct(idx.change24h)}
            </span>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs">
            {idx.basket.map((b) => (
              <li key={b.symbol} className="flex items-center justify-between font-mono">
                <span className="text-zinc-100">{b.symbol}</span>
                <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                  <span className="tabular-nums text-zinc-400">w {b.weight}%</span>
                  <span className={`tabular-nums ${b.contribution24h >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {formatPct(b.contribution24h)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ))}

      <Panel title="Z · what these tell you" subtitle="Read-only research context" className="md:col-span-6">
        <p className="text-[12px] text-zinc-300">
          MarketMind surfaces SSI baskets as research context. The contribution column shows how much
          each constituent is moving the index today (weight times 24h return). The MarketMind Index
          (MMX) above is computed by this engine from a market-cap weighting with a single-name cap,
          and is the basket MarketMind rates highest-conviction. MarketMind never rebalances an
          on-chain index &mdash; that is an executor&rsquo;s job. {ssi.data ? `Live constituent points joined: ${ssi.data.livePoints}.` : ""}
        </p>
      </Panel>

      {mmx ? (
        <Panel title="Y · index NAV" subtitle="Rebased to 100 at inception" className="md:col-span-6">
          <div className="flex flex-wrap items-baseline gap-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">MMX NAV</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-zinc-100">{mmx.nav.toFixed(2)}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">conviction</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-[#f97316]">{mmx.convictionScore}<span className="text-base text-zinc-500">/100</span></p>
            </div>
            <div className="min-w-[200px]">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">top weight</p>
              <p className="mt-1 text-sm text-zinc-300">
                {mmx.constituents[0]?.symbol} · {mmx.constituents[0]?.targetWeight.toFixed(1)}% (capped at {mmx.methodology.singleNameCap}%)
              </p>
            </div>
          </div>
        </Panel>
      ) : null}
    </MarketMindLayout>
  );
}
