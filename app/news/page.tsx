import MarketMindLayout from "../components/MarketMindLayout";

export default function NewsPage() {
  return (
    <MarketMindLayout title="News Intelligence" subtitle="Interpreted news, not raw headlines">
      <section className="border border-orange-500/60 bg-zinc-950 p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Filtered News</h2>
        <div className="space-y-2 text-sm">
          <div className="border border-zinc-700 bg-black p-3">ETF flows jump as risk appetite recovers</div>
          <div className="border border-zinc-700 bg-black p-3">AI token ecosystem announces new integrations</div>
        </div>
      </section>

      <section className="border border-orange-500/60 bg-zinc-950 p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">AI Summary per News</h2>
        <div className="space-y-2 text-sm">
          <div className="border border-zinc-700 bg-black p-3">
            Institutional flow headline supports large-cap upside continuation.
          </div>
          <div className="border border-zinc-700 bg-black p-3">
            AI ecosystem expansion fuels sector-relative strength.
          </div>
        </div>
      </section>

      <section className="border border-orange-500/60 bg-zinc-950 p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Impact Tag</h2>
        <div className="space-y-2 text-sm">
          <div className="border border-zinc-700 bg-black p-3">ETF flows jump: Bullish</div>
          <div className="border border-zinc-700 bg-black p-3">Regulatory headline: Neutral</div>
          <div className="border border-zinc-700 bg-black p-3">Yield spike warning: Bearish</div>
        </div>
      </section>

      <section className="border border-orange-500/60 bg-zinc-950 p-5">
        <h2 className="mb-3 text-lg font-semibold text-orange-300">Affected Assets</h2>
        <div className="space-y-2 text-sm">
          <div className="border border-zinc-700 bg-black p-3">BTC, ETH, SOL</div>
          <div className="border border-zinc-700 bg-black p-3">FET, RNDR, TAO</div>
        </div>
      </section>
    </MarketMindLayout>
  );
}
