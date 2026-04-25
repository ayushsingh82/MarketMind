import MarketMindLayout from "../components/MarketMindLayout";

export default function WatchlistPage() {
  return (
    <MarketMindLayout title="Watchlist" subtitle="Track prioritized assets and narratives">
      <section className="border border-orange-500/60 bg-zinc-950 p-6">
        <h2 className="mb-4 text-lg font-semibold text-orange-300">Saved Assets</h2>
        <div className="space-y-3 text-sm">
          <div className="rounded-sm border border-zinc-700 bg-black p-4">BTC · Macro-sensitive</div>
          <div className="rounded-sm border border-zinc-700 bg-black p-4">ETH · ETF flow-driven</div>
          <div className="rounded-sm border border-zinc-700 bg-black p-4">FET · AI sector beta</div>
        </div>
      </section>

      <section className="border border-orange-500/60 bg-zinc-950 p-6">
        <h2 className="mb-4 text-lg font-semibold text-orange-300">Why These Matter</h2>
        <div className="space-y-3 text-sm text-zinc-200">
          <div className="rounded-sm border border-zinc-700 bg-black p-4">
            BTC acts as risk barometer around macro event windows.
          </div>
          <div className="rounded-sm border border-zinc-700 bg-black p-4">
            ETH captures institutional demand shifts quickly.
          </div>
          <div className="rounded-sm border border-zinc-700 bg-black p-4">
            FET represents high-conviction AI narrative exposure.
          </div>
        </div>
      </section>
    </MarketMindLayout>
  );
}
