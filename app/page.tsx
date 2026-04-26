import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-5 text-white">
      <div className="pointer-events-none absolute right-8 top-16 hidden border border-zinc-800 bg-[#141414] p-4 text-xs text-zinc-400 md:block">
        MULTI-SOURCE REASONING
      </div>
      <div className="pointer-events-none absolute bottom-16 left-8 hidden border border-zinc-800 bg-[#141414] p-4 text-xs text-zinc-400 md:block">
        CONTRADICTION DETECTION
      </div>
      <div className="w-full max-w-5xl space-y-6 text-center">
        <section className="relative border border-zinc-800 bg-[#141414] px-8 py-12 md:px-14 md:py-16">
          <span className="absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-orange-400" />
          <span className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-orange-400" />
          <span className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-orange-400" />
          <span className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-orange-400" />
          <p className="text-xs tracking-[0.35em] text-orange-400">MARKETMIND</p>
          <h1 className="mt-3 text-3xl font-semibold md:text-5xl">AI Market Intelligence Engine</h1>
          <p className="mx-auto mt-3 max-w-3xl text-sm text-zinc-300">
            Multi-source reasoning across news, price, macro, and sectors. MarketMind maps cause
            to effect, detects contradictions, and delivers personalized intelligence with charted
            evidence.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
            <Link
              href="/dashboard"
              className="relative border border-orange-500 bg-orange-500/10 px-6 py-3 font-semibold text-orange-300"
            >
              <span className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-white" />
              <span className="absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-white" />
              <span className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-white" />
              <span className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-white" />
              Open Intelligence Panel
            </Link>
            <Link href="/ask" className="border border-zinc-700 bg-black px-4 py-2 text-zinc-300">
              Ask Market
            </Link>
          </div>
        </section>

        <section className="grid w-full gap-3 text-left md:grid-cols-3">
          <div className="border border-zinc-800 bg-[#141414] p-4">
            <p className="text-xs text-zinc-400">Multi-Source Reasoning</p>
            <p className="mt-2 text-sm">Links macro, sentiment, flows, and price into one thesis.</p>
          </div>
          <div className="border border-zinc-800 bg-[#141414] p-4">
            <p className="text-xs text-zinc-400">Cause to Effect Map</p>
            <p className="mt-2 text-sm">Shows market event chains, not isolated headlines.</p>
          </div>
          <div className="border border-zinc-800 bg-[#141414] p-4">
            <p className="text-xs text-zinc-400">Personalized Signals</p>
            <p className="mt-2 text-sm">Watchlist-aware alerts and insights for faster decisions.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
