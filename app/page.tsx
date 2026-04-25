import MarketMindLayout from "./components/MarketMindLayout";

export default function Home() {
  return (
    <MarketMindLayout
      title="Main Dashboard"
      subtitle="What is happening in the market right now"
    >
      <section className="border border-orange-500/60 bg-zinc-950 p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Market Summary</h2>
        <div className="space-y-2 text-sm">
          <div className="border border-zinc-700 bg-black p-3">BTC: -1.8% · ETH: +2.4% · SV Index: +0.9%</div>
          <div className="border border-zinc-700 bg-black p-3">Top gainers: RNDR, FET, INJ</div>
          <div className="border border-zinc-700 bg-black p-3">Top losers: DOGE, AVAX, LINK</div>
        </div>
      </section>

      <section className="border border-orange-500/60 bg-zinc-950 p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Key Insights Panel</h2>
        <div className="space-y-2 text-sm">
          <div className="border border-zinc-700 bg-black p-3">ETH rising due to sustained ETF inflow.</div>
          <div className="border border-zinc-700 bg-black p-3">AI sector gaining momentum vs broad market.</div>
          <div className="border border-zinc-700 bg-black p-3">Risk appetite improving after softer macro data.</div>
        </div>
      </section>

      <section className="border border-orange-500/60 bg-zinc-950 p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Macro Events Today</h2>
        <div className="space-y-2 text-sm">
          <div className="border border-zinc-700 bg-black p-3">Fed speaker 13:30 UTC</div>
          <div className="border border-zinc-700 bg-black p-3">US CPI estimate release 14:00 UTC</div>
        </div>
      </section>

      <section className="border border-orange-500/60 bg-zinc-950 p-5 md:col-span-2">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Hot News Feed</h2>
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <div className="border border-zinc-700 bg-black p-3">
            ETF inflows accelerate across large-cap assets
          </div>
          <div className="border border-zinc-700 bg-black p-3">
            AI token basket outperforms as volume expands
          </div>
          <div className="border border-zinc-700 bg-black p-3">
            Treasury yields cool, crypto risk appetite rebounds
          </div>
          <div className="border border-zinc-700 bg-black p-3">
            Stablecoin velocity rises in derivatives markets
          </div>
        </div>
      </section>
    </MarketMindLayout>
  );
}
