import MarketMindLayout from "../components/MarketMindLayout";
import MarketMindChartCard from "../components/MarketMindChartCard";

export default function SectorsPage() {
  return (
    <MarketMindLayout
      title="Sector & Trend Explorer"
      subtitle="Discover leaders, laggards, and narratives"
    >
      <section className="border border-orange-500/60 bg-zinc-950 p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Sector Performance</h2>
        <div className="space-y-2 text-sm">
          <div className="border border-zinc-700 bg-black p-3">AI: +8.2%</div>
          <div className="border border-zinc-700 bg-black p-3">L1: +2.1%</div>
          <div className="border border-zinc-700 bg-black p-3">DeFi: -0.7%</div>
        </div>
      </section>

      <section className="border border-orange-500/60 bg-zinc-950 p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Top Growing Sectors</h2>
        <div className="space-y-2 text-sm">
          <div className="border border-zinc-700 bg-black p-3">1) AI Infrastructure</div>
          <div className="border border-zinc-700 bg-black p-3">2) Liquid Staking</div>
          <div className="border border-zinc-700 bg-black p-3">3) Real-world assets</div>
        </div>
      </section>

      <section className="border border-orange-500/60 bg-zinc-950 p-5 md:col-span-2">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">AI Commentary</h2>
        <div className="border border-zinc-700 bg-black p-4 text-sm text-zinc-200">
          AI tokens are trending due to synchronized catalysts: improving macro backdrop, expanding
          on-chain activity, and elevated narrative intensity in market media.
        </div>
      </section>

      <section className="border border-orange-500/60 bg-zinc-950 p-5 md:col-span-2">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Sector Performance Chart</h2>
        <MarketMindChartCard
          title="Sector Growth Comparison"
          type="bar"
          note="Bar chart of sector performance for trend discovery."
        />
      </section>
    </MarketMindLayout>
  );
}
