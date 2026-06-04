"use client";

import { useState } from "react";
import MarketMindLayout from "../components/MarketMindLayout";
import Panel from "../components/Panel";
import { useLiveData, formatPct } from "@/lib/useLiveData";

type Ticker = {
  symbol: string;
  last: number;
  change24h: number;
  volume24h: number;
  takerBuyRatio: number;
};

type SodexData = {
  flow: {
    symbol: string;
    takerBuyRatio: number;
    spreadBps: number;
    depthImbalance: number;
    netFlow1m: number;
    fundingRate?: number;
    signal: "absorbing-bids" | "absorbing-offers" | "balanced" | "thin";
    note: string;
  }[];
  ticker: Ticker;
  tickers: Ticker[];
  trades: { id: string; symbol: string; side: "BUY" | "SELL"; price: number; size: number; ts: number }[];
  orderbook: {
    symbol: string;
    bids: { price: number; size: number }[];
    asks: { price: number; size: number }[];
    spreadBps: number;
    depthImbalance: number;
  };
};

const SIGNAL_TONE: Record<SodexData["flow"][number]["signal"], string> = {
  "absorbing-offers": "border-emerald-400/40 text-emerald-300",
  "absorbing-bids": "border-rose-400/40 text-rose-300",
  thin: "border-amber-400/40 text-amber-300",
  balanced: "border-zinc-700 text-zinc-300",
};

const PAIRS = ["ETH-USDT", "BTC-USDT", "SOL-USDT", "ARB-USDT", "FET-USDT"];

function timeAgo(ts: number) {
  const d = Math.max(0, Date.now() - ts);
  if (d < 60_000) return `${Math.floor(d / 1000)}s`;
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`;
  return `${Math.floor(d / 3_600_000)}h`;
}

export default function SodexFlowPage() {
  const [pair, setPair] = useState("ETH-USDT");
  const sodex = useLiveData<SodexData>(`/api/marketmind/sodex?symbol=${pair}`, 5000);

  const maxBidSize = Math.max(...(sodex.data?.orderbook.bids ?? []).map((b) => b.size), 1);
  const maxAskSize = Math.max(...(sodex.data?.orderbook.asks ?? []).map((a) => a.size), 1);
  const maxDepth = Math.max(maxBidSize, maxAskSize);
  const last = sodex.data?.ticker?.last;

  return (
    <MarketMindLayout title="12 · sodex-flow" subtitle="Microstructure · spread · depth · taker-bias">
      {/* Per-pair flow signals — compact 4-stat cards */}
      <Panel
        title="A · per-pair flow"
        subtitle="Spread · taker-buy · depth imbalance · derived signal"
        status={sodex.status}
        source={sodex.source}
        updatedAt={sodex.updatedAt}
        className="md:col-span-6"
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {(sodex.data?.flow ?? []).map((p) => (
            <button
              key={p.symbol}
              onClick={() => setPair(p.symbol)}
              className={`text-left rounded-sm border bg-[#0c0c0e] p-3 transition hover:border-[#f97316] ${
                p.symbol === pair ? "ring-1 ring-[#f97316]/60" : ""
              } ${SIGNAL_TONE[p.signal]}`}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[12px] tracking-wider text-zinc-100">{p.symbol}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.2em]">{p.signal}</span>
              </div>
              <div className="mt-2 flex items-end justify-between font-mono text-[11px]">
                <span className="text-zinc-500">spr</span>
                <span className="tabular-nums text-zinc-200">{p.spreadBps.toFixed(1)}</span>
                <span className="text-zinc-600">bps</span>
              </div>
              <div className="mt-1 flex items-end justify-between font-mono text-[11px]">
                <span className="text-zinc-500">tk</span>
                <span className={`tabular-nums ${p.takerBuyRatio > 0.5 ? "text-emerald-300" : p.takerBuyRatio < 0.5 ? "text-rose-300" : "text-zinc-200"}`}>
                  {(p.takerBuyRatio * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-1 flex items-end justify-between font-mono text-[11px]">
                <span className="text-zinc-500">imb</span>
                <span className={`tabular-nums ${p.depthImbalance > 0 ? "text-emerald-300" : p.depthImbalance < 0 ? "text-rose-300" : "text-zinc-200"}`}>
                  {p.depthImbalance >= 0 ? "+" : ""}
                  {p.depthImbalance.toFixed(2)}
                </span>
              </div>
              {p.fundingRate != null ? (
                <div className="mt-1 flex items-end justify-between font-mono text-[11px]">
                  <span className="text-zinc-500">fund</span>
                  <span className={`tabular-nums ${p.fundingRate > 0 ? "text-emerald-300" : p.fundingRate < 0 ? "text-rose-300" : "text-zinc-200"}`}>
                    {(p.fundingRate * 100).toFixed(4)}%
                  </span>
                </div>
              ) : null}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-zinc-400">
          {(sodex.data?.flow ?? []).find((f) => f.symbol === pair)?.note ?? ""}
        </p>
      </Panel>

      {/* Orderbook with depth bars */}
      <Panel
        title={`B · ${pair} orderbook`}
        subtitle={
          sodex.data
            ? `spread ${sodex.data.orderbook.spreadBps.toFixed(1)} bps · imbalance ${sodex.data.orderbook.depthImbalance >= 0 ? "+" : ""}${sodex.data.orderbook.depthImbalance.toFixed(2)}`
            : "loading"
        }
        status={sodex.status}
        source={sodex.source}
        updatedAt={sodex.updatedAt}
        className="md:col-span-3"
      >
        <div className="grid grid-cols-2 gap-1 font-mono text-[11px]">
          <div>
            <div className="grid grid-cols-3 border-b border-zinc-800 pb-1 text-[9px] uppercase tracking-[0.22em] text-zinc-500">
              <span>price</span>
              <span className="text-right">size</span>
              <span className="text-right">depth</span>
            </div>
            {(sodex.data?.orderbook.bids ?? []).map((b, i) => {
              const pct = (b.size / maxDepth) * 100;
              return (
                <div key={`b${i}`} className="relative grid grid-cols-3 py-0.5">
                  <div
                    className="absolute right-0 top-0 h-full bg-emerald-400/10"
                    style={{ width: `${pct}%` }}
                  />
                  <span className="relative tabular-nums text-emerald-300">{b.price.toFixed(2)}</span>
                  <span className="relative text-right tabular-nums text-zinc-300">{b.size.toFixed(3)}</span>
                  <span className="relative text-right tabular-nums text-zinc-500">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
          <div>
            <div className="grid grid-cols-3 border-b border-zinc-800 pb-1 text-[9px] uppercase tracking-[0.22em] text-zinc-500">
              <span>price</span>
              <span className="text-right">size</span>
              <span className="text-right">depth</span>
            </div>
            {(sodex.data?.orderbook.asks ?? []).map((a, i) => {
              const pct = (a.size / maxDepth) * 100;
              return (
                <div key={`a${i}`} className="relative grid grid-cols-3 py-0.5">
                  <div className="absolute left-0 top-0 h-full bg-rose-400/10" style={{ width: `${pct}%` }} />
                  <span className="relative tabular-nums text-rose-300">{a.price.toFixed(2)}</span>
                  <span className="relative text-right tabular-nums text-zinc-300">{a.size.toFixed(3)}</span>
                  <span className="relative text-right tabular-nums text-zinc-500">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
        {last ? (
          <p className="mt-2 border-t border-zinc-800 pt-2 text-center font-mono text-[11px] text-zinc-400">
            last <span className="text-[#f97316] tabular-nums">{last.toFixed(2)}</span>
          </p>
        ) : null}
      </Panel>

      {/* Recent prints — uniform mono table */}
      <Panel
        title={`C · ${pair} recent prints`}
        subtitle="Most recent 14 fills"
        status={sodex.status}
        source={sodex.source}
        updatedAt={sodex.updatedAt}
        className="md:col-span-3"
      >
        <table className="w-full font-mono text-[11px]">
          <thead className="text-left text-[9px] uppercase tracking-[0.22em] text-zinc-500">
            <tr>
              <th className="pb-1">side</th>
              <th className="pb-1 text-right">price</th>
              <th className="pb-1 text-right">size</th>
              <th className="pb-1 text-right">ago</th>
            </tr>
          </thead>
          <tbody>
            {(sodex.data?.trades ?? []).slice(0, 14).map((t) => (
              <tr key={t.id} className="border-t border-zinc-900">
                <td className={`py-0.5 ${t.side === "BUY" ? "text-emerald-300" : "text-rose-300"}`}>{t.side}</td>
                <td className="py-0.5 text-right tabular-nums text-zinc-200">{t.price.toFixed(2)}</td>
                <td className="py-0.5 text-right tabular-nums text-zinc-400">{t.size.toFixed(3)}</td>
                <td className="py-0.5 text-right tabular-nums text-zinc-600">{timeAgo(t.ts)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {/* Tickers */}
      <Panel
        title="D · ticker overview"
        subtitle="24h change · volume · taker-buy across tracked pairs"
        status={sodex.status}
        source={sodex.source}
        updatedAt={sodex.updatedAt}
        className="md:col-span-6"
      >
        <table className="w-full font-mono text-[11px]">
          <thead className="text-left text-[9px] uppercase tracking-[0.22em] text-zinc-500">
            <tr>
              <th className="py-1.5 pr-3">pair</th>
              <th className="py-1.5 pr-3 text-right">last</th>
              <th className="py-1.5 pr-3 text-right">24h</th>
              <th className="py-1.5 pr-3 text-right">volume</th>
              <th className="py-1.5 text-right">taker-buy</th>
            </tr>
          </thead>
          <tbody className="text-zinc-200">
            {(sodex.data?.tickers ?? []).map((t) => (
              <tr key={t.symbol} className="border-t border-zinc-900">
                <td className="py-1 pr-3 tracking-wider">{t.symbol}</td>
                <td className="py-1 pr-3 text-right tabular-nums">{t.last.toFixed(t.last < 5 ? 4 : 2)}</td>
                <td className={`py-1 pr-3 text-right tabular-nums ${t.change24h >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {formatPct(t.change24h)}
                </td>
                <td className="py-1 pr-3 text-right tabular-nums text-zinc-400">
                  {t.volume24h.toLocaleString()}
                </td>
                <td className={`py-1 text-right tabular-nums ${t.takerBuyRatio > 0.5 ? "text-emerald-300" : t.takerBuyRatio < 0.5 ? "text-rose-300" : "text-zinc-300"}`}>
                  {(t.takerBuyRatio * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
            {!sodex.data ? (
              <tr>
                <td colSpan={5} className="py-2 text-center text-zinc-500">
                  loading tickers…
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <p className="mt-3 text-[11px] text-zinc-500">
          PAIRS: {PAIRS.join(" · ")}
        </p>
      </Panel>
    </MarketMindLayout>
  );
}
