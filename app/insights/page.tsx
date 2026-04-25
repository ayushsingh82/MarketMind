import MarketMindLayout from "../components/MarketMindLayout";
import MarketMindChartCard from "../components/MarketMindChartCard";

export default function InsightsPage() {
  return (
    <MarketMindLayout title="Personalized Insights" subtitle="Relevant intelligence for the user">
      <section className="border border-orange-500/60 bg-zinc-950 p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">User Watchlist</h2>
        <div className="space-y-2 text-sm">
          <div className="border border-zinc-700 bg-black p-3">BTC</div>
          <div className="border border-zinc-700 bg-black p-3">ETH</div>
          <div className="border border-zinc-700 bg-black p-3">FET</div>
        </div>
      </section>

      <section className="border border-orange-500/60 bg-zinc-950 p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Insights for You</h2>
        <div className="space-y-2 text-sm">
          <div className="border border-zinc-700 bg-black p-3">
            BTC in watchlist is sensitive to tomorrow's CPI print.
          </div>
          <div className="border border-zinc-700 bg-black p-3">
            ETH is showing stronger institutional flow than peers.
          </div>
        </div>
      </section>

      <section className="border border-orange-500/60 bg-zinc-950 p-5 md:col-span-2">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Alerts</h2>
        <div className="grid gap-2 text-sm md:grid-cols-3">
          <div className="border border-zinc-700 bg-black p-3">Risk warning: volatility spike +14%</div>
          <div className="border border-zinc-700 bg-black p-3">Sector shift: AI overtook DeFi flows</div>
          <div className="border border-zinc-700 bg-black p-3">Macro alert: Fed commentary in 3h</div>
        </div>
      </section>

      <section className="border border-orange-500/60 bg-zinc-950 p-5 md:col-span-2">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Sentiment Chart</h2>
        <MarketMindChartCard
          title="Bullish vs Bearish Trend"
          type="line"
          note="Line/area sentiment trend generated from processed news signals."
        />
      </section>
    </MarketMindLayout>
  );
}
