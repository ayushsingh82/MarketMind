"use client";

import { FormEvent, useState } from "react";
import MarketMindLayout from "../components/MarketMindLayout";
import Panel from "../components/Panel";
import type { AskResponse } from "@/lib/types";

const SUGGESTIONS = [
  "Why is BTC down while AI tokens are up?",
  "What's driving ETH right now?",
  "Is the AI narrative still accelerating?",
  "How risky is the macro calendar this week?",
];

export default function AskPage() {
  const [query, setQuery] = useState("Why is BTC down while AI tokens are up?");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ analysis: AskResponse; query: string } | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(q: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketmind/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const json = await res.json();
      if (json.ok) {
        setResponse(json.data);
        setSource(json.source);
      } else {
        setError(json.error ?? "Ask failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (query.trim()) submit(query.trim());
  }

  const analysis = response?.analysis;

  return (
    <MarketMindLayout title="01 · ask-market" subtitle="Cited Reasoning · Contradictions · Confidence">
      <Panel title="A · query" subtitle="Ask anything cross-asset · cross-source" className="md:col-span-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Why is BTC down while AI tokens are up?"
            className="flex-1 rounded-sm border border-zinc-800 bg-[#0c0c0e] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-[#f97316] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-sm border border-[#f97316] bg-[#f97316] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#fb923c] disabled:opacity-50"
          >
            {loading ? "Reading sources…" : "Ask MarketMind"}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQuery(s);
                submit(s);
              }}
              className="rounded-sm border border-zinc-800 bg-[#0c0c0e] px-3 py-1.5 text-[11px] text-zinc-400 transition hover:border-[#f97316] hover:text-white"
            >
              {s}
            </button>
          ))}
        </div>
        {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
      </Panel>

      <Panel
        title="B · thesis"
        subtitle={response ? `confidence ${(analysis!.confidence * 100).toFixed(0)}%` : "awaiting query"}
        source={source ?? undefined}
        status={response ? "live" : "loading"}
        className="md:col-span-4"
      >
        <p className="text-sm leading-7 text-zinc-100">
          {analysis?.thesis ?? "Send a question to receive a cited thesis."}
        </p>
        {analysis ? (
          <div className="mt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">impact</p>
            <p className="mt-1 text-[12px] text-zinc-300">{analysis.impact}</p>
          </div>
        ) : null}
        {analysis ? (
          <div className="mt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">causes</p>
            <ul className="mt-1 space-y-1 text-[12px] text-zinc-300">
              {analysis.causes.map((c) => (
                <li key={c} className="flex gap-2">
                  <span className="text-[#f97316]">›</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="C · evidence"
        subtitle="Cited sources from SoSoValue news"
        status={response ? "live" : "loading"}
        source={source ?? undefined}
        className="md:col-span-2"
      >
        <ul className="space-y-2 text-[11px]">
          {(analysis?.evidence ?? []).map((e, i) => (
            <li key={i} className="rounded-sm border border-zinc-800/80 bg-[#0c0c0e] p-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#f97316]">{e.label}</p>
              <p className="mt-1 line-clamp-3 text-zinc-200">{e.value}</p>
              <p className="mt-1 text-[10px] text-zinc-500">{e.source}</p>
            </li>
          ))}
          {!analysis ? <li className="text-[11px] text-zinc-500">Evidence list appears here after Ask.</li> : null}
        </ul>
      </Panel>

      <Panel
        title="D · contradictions"
        subtitle="Where sources disagree right now"
        status={response ? "live" : "loading"}
        source={source ?? undefined}
        className="md:col-span-3"
      >
        <ul className="space-y-2 text-[12px] text-zinc-300">
          {(analysis?.contradictions ?? []).map((c, i) => (
            <li key={i} className="rounded-sm border border-amber-400/30 bg-[#0c0c0e] p-2">
              {c}
            </li>
          ))}
          {analysis && analysis.contradictions.length === 0 ? (
            <li className="text-[11px] text-zinc-500">No active contradictions for this query.</li>
          ) : null}
        </ul>
      </Panel>

      <Panel
        title="E · suggestions"
        subtitle="Process notes — never an order"
        status={response ? "live" : "loading"}
        className="md:col-span-3"
      >
        <ul className="space-y-2 text-[12px] text-zinc-300">
          {(analysis?.suggestions ?? []).map((s, i) => (
            <li key={i} className="rounded-sm border border-zinc-800/80 bg-[#0c0c0e] p-2">
              <span className="text-[#f97316]">› </span>
              {s}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="F · sources used"
        subtitle="Live counts feeding this answer"
        status={response ? "live" : "loading"}
        source={source ?? undefined}
        className="md:col-span-6"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <Counter label="news headlines" value={analysis?.sources.newsCount} />
          <Counter label="market points" value={analysis?.sources.marketPoints} />
          <Counter label="macro events" value={analysis?.sources.macroEvents} />
        </div>
      </Panel>
    </MarketMindLayout>
  );
}

function Counter({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-sm border border-zinc-800 bg-[#0c0c0e] p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-100">{value ?? "—"}</p>
    </div>
  );
}
