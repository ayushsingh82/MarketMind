import MarketMindChartCard from "../components/MarketMindChartCard";
import MarketMindLayout from "../components/MarketMindLayout";

export default function DashboardPage() {
  return (
    <MarketMindLayout title="Market Intelligence Panel" subtitle="Overview, insights, and explainable trends">
      <section className="border border-zinc-800 bg-[#141414] p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Market Summary</h2>
        <div className="space-y-2 text-sm">
          <div className="border border-zinc-700 bg-black p-3">BTC: -1.8% · ETH: +2.4% · Index: +0.9%</div>
          <div className="border border-zinc-700 bg-black p-3">Top gainers: RNDR, FET, INJ</div>
          <div className="border border-zinc-700 bg-black p-3">Top losers: DOGE, AVAX, LINK</div>
        </div>
      </section>

      <section className="border border-zinc-800 bg-[#141414] p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Top Insights</h2>
        <div className="space-y-2 text-sm">
          <div className="border border-zinc-700 bg-black p-3">ETF inflow is supporting ETH strength.</div>
          <div className="border border-zinc-700 bg-black p-3">AI sector breadth remains above baseline.</div>
          <div className="border border-zinc-700 bg-black p-3">Contradiction: bullish flow but rising macro risk.</div>
        </div>
      </section>

      <section className="border border-zinc-800 bg-[#141414] p-5 md:col-span-2">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Market Overview Chart</h2>
        <MarketMindChartCard
          title="BTC / ETH / Index"
          type="multiline"
          note="Comparative market movement baseline."
        />
      </section>

      <section className="border border-zinc-800 bg-[#141414] p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">News Impact Timeline</h2>
        <MarketMindChartCard
          title="Event to Price Map"
          type="timeline"
          note="Maps headline timestamps to market response."
        />
      </section>

      <section className="border border-zinc-800 bg-[#141414] p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Sentiment Trend</h2>
        <MarketMindChartCard
          title="Bullish vs Bearish"
          type="line"
          note="Sentiment balance over rolling windows."
        />
      </section>
    </MarketMindLayout>
  );
}
