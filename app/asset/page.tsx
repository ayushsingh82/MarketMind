import MarketMindLayout from "../components/MarketMindLayout";
import MarketMindChartCard from "../components/MarketMindChartCard";

export default function AssetPage() {
  return (
    <MarketMindLayout title="Asset Analysis" subtitle="Deep dive into one asset">
      <section className="border border-orange-500/60 bg-zinc-950 p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Price + Chart</h2>
        <MarketMindChartCard
          title="Asset Deep Dive"
          type="candlestick"
          note="Candlestick + volume view from /currency/historical-klines."
        />
      </section>

      <section className="border border-orange-500/60 bg-zinc-950 p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Key Drivers</h2>
        <div className="space-y-2 text-sm">
          <div className="border border-zinc-700 bg-black p-3">News impact: bullish coverage intensity up 19%</div>
          <div className="border border-zinc-700 bg-black p-3">Sentiment: net positive across tracked channels</div>
        </div>
      </section>

      <section className="border border-orange-500/60 bg-zinc-950 p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">AI Explanation</h2>
        <div className="border border-zinc-700 bg-black p-4 text-sm">
          ETH move is primarily flow-driven, with macro tailwind and moderate derivatives leverage.
        </div>
      </section>

      <section className="border border-orange-500/60 bg-zinc-950 p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Related Assets / Sector</h2>
        <div className="space-y-2 text-sm">
          <div className="border border-zinc-700 bg-black p-3">L2 basket: OP, ARB, STRK</div>
          <div className="border border-zinc-700 bg-black p-3">Smart-contract platform index +1.7%</div>
        </div>
      </section>
    </MarketMindLayout>
  );
}
