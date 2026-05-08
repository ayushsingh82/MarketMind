"use client";

import MarketMindLayout from "../components/MarketMindLayout";
import Panel from "../components/Panel";
import { useLiveData, formatPct } from "@/lib/useLiveData";

type StakingData = {
  yields: {
    asset: string;
    protocol: string;
    apy: number;
    apy7dDelta: number;
    tvlUsd: number;
    riskTier: "low" | "moderate" | "elevated";
    note: string;
  }[];
  blendedApy: number;
  elevatedShare: number;
  note: string;
};

const RISK_TONE: Record<StakingData["yields"][number]["riskTier"], string> = {
  low: "text-emerald-300 border-emerald-400/40",
  moderate: "text-amber-300 border-amber-400/40",
  elevated: "text-rose-300 border-rose-400/40",
};

export default function StakingPage() {
  const staking = useLiveData<StakingData>("/api/marketmind/staking", 9000);

  return (
    <MarketMindLayout title="13 · staking-yield" subtitle="Yield Landscape & Risk-Tier Read">
      <Panel
        title="A · blended yield"
        subtitle="Cross-protocol blended APY + elevated-tier share"
        status={staking.status}
        source={staking.source}
        updatedAt={staking.updatedAt}
        className="md:col-span-6"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-sm border border-zinc-800 bg-[#0c0c0e] p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">blended apy</p>
            <p className="text-3xl font-semibold tabular-nums text-[#f97316]">
              {staking.data ? `${staking.data.blendedApy.toFixed(2)}%` : "—"}
            </p>
            <p className="text-[11px] text-zinc-500">across native + liquid + restake</p>
          </div>
          <div className="rounded-sm border border-zinc-800 bg-[#0c0c0e] p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">elevated-tier share</p>
            <p className="text-3xl font-semibold tabular-nums text-amber-300">
              {staking.data ? `${(staking.data.elevatedShare * 100).toFixed(0)}%` : "—"}
            </p>
            <p className="text-[11px] text-zinc-500">restaking + early-stage protocols</p>
          </div>
          <div className="rounded-sm border border-zinc-800 bg-[#0c0c0e] p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">commentary</p>
            <p className="mt-1 text-[12px] text-zinc-300">{staking.data?.note ?? "Loading risk-tier read…"}</p>
          </div>
        </div>
      </Panel>

      <Panel
        title="B · yield landscape"
        subtitle="Per-protocol APY · 7d delta · TVL · risk tier"
        status={staking.status}
        source={staking.source}
        updatedAt={staking.updatedAt}
        className="md:col-span-6"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {(staking.data?.yields ?? []).map((y, i) => (
            <div key={`${y.asset}-${y.protocol}-${i}`} className={`rounded-sm border bg-[#0c0c0e] p-3 ${RISK_TONE[y.riskTier]}`}>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-sm tracking-wider text-zinc-100">{y.asset}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em]">{y.riskTier}</span>
              </div>
              <p className="text-[11px] text-zinc-400">{y.protocol}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-zinc-500">
                <Stat label="apy" value={`${y.apy.toFixed(2)}%`} />
                <Stat label="7d Δ" value={formatPct(y.apy7dDelta, 2)} />
                <Stat label="tvl" value={`$${(y.tvlUsd / 1e9).toFixed(2)}b`} />
              </div>
              <p className="mt-2 text-[11px] text-zinc-400">{y.note}</p>
            </div>
          ))}
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
