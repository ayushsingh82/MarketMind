import MarketMindLayout from "../components/MarketMindLayout";

export default function AskPage() {
  return (
    <MarketMindLayout title="Ask the Market" subtitle="Interactive AI analyst experience">
      <section className="border border-orange-500/60 bg-zinc-950 p-5 md:col-span-2">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Search / Ask Input</h2>
        <div className="border border-zinc-700 bg-black p-3 text-sm text-zinc-400">
          Why is BTC down while AI tokens are up?
        </div>
      </section>

      <section className="border border-orange-500/60 bg-zinc-950 p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">AI Response Panel</h2>
        <div className="space-y-2 text-sm">
          <div className="border border-zinc-700 bg-black p-3">
            Cause: macro risk pressure on majors with sector rotation into AI.
          </div>
          <div className="border border-zinc-700 bg-black p-3">
            Supporting data: BTC funding and ETF flow softened, AI basket volume increased.
          </div>
          <div className="border border-zinc-700 bg-black p-3">
            Impact: near-term divergence likely until macro event passes.
          </div>
        </div>
      </section>

      <section className="border border-orange-500/60 bg-zinc-950 p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Sources Used</h2>
        <div className="space-y-2 text-sm">
          <div className="border border-zinc-700 bg-black p-3">News feed: 8 matched headlines</div>
          <div className="border border-zinc-700 bg-black p-3">Market data: 24h snapshot + volume trend</div>
          <div className="border border-zinc-700 bg-black p-3">Macro: upcoming CPI + yield movement</div>
        </div>
      </section>
    </MarketMindLayout>
  );
}
