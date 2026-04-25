export default function Home() {
  const prompts = [
    "Why is BTC down today?",
    "What sectors are leading this week?",
    "Is ETH rallying on macro or ETF flow?",
  ];

  const engine = [
    "Ingest SoSoValue News Feed",
    "Attach Macro Events and Market Snapshot",
    "Run AI correlation and reasoning layer",
    "Generate human-like explanation with confidence",
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <main className="mx-auto grid max-w-6xl gap-5 px-6 py-10 md:grid-cols-2">
        <section className="border border-orange-500/80 bg-zinc-950 p-6 md:col-span-2">
          <p className="mb-2 text-xs tracking-[0.35em] text-orange-400">MARKETMIND</p>
          <h1 className="mb-4 text-4xl font-bold leading-tight md:text-5xl">
            AI That Explains Markets Like a Human Analyst
          </h1>
          <p className="max-w-3xl text-zinc-300">
            MarketMind turns SoSoValue news, macro, ETF, and index data into clear explanations
            about what is happening in the market and why.
          </p>
        </section>

        <section className="border border-orange-600/80 bg-zinc-950 p-5">
          <h2 className="mb-4 text-lg font-semibold text-orange-300">Reasoning Engine</h2>
          <div className="grid gap-3">
            {engine.map((step, index) => (
              <div key={step} className="border border-zinc-700 bg-black p-3">
                <p className="text-xs text-orange-400">PHASE {index + 1}</p>
                <p className="text-sm text-zinc-200">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-orange-600/80 bg-zinc-950 p-5">
          <h2 className="mb-4 text-lg font-semibold text-orange-300">Ask MarketMind</h2>
          <div className="grid gap-3">
            {prompts.map((prompt) => (
              <div key={prompt} className="border border-zinc-700 bg-black p-3 text-sm text-zinc-200">
                {prompt}
              </div>
            ))}
          </div>
        </section>

        <section className="border border-orange-600/80 bg-zinc-950 p-5">
          <h2 className="mb-3 text-lg font-semibold text-orange-300">Sample Insight</h2>
          <div className="border border-orange-500/70 bg-black p-4 text-sm text-zinc-200">
            <p className="mb-2 text-orange-400">Why is ETH pumping?</p>
            <p className="mb-2">
              ETH rises as risk appetite improves after a softer macro print while ETF net flows
              remain positive for two sessions.
            </p>
            <p className="text-zinc-400">
              Supporting data: ETF flow +2.8%, index momentum +1.9%, macro risk indicator easing.
            </p>
          </div>
        </section>

        <section className="border border-orange-600/80 bg-zinc-950 p-5">
          <h2 className="mb-3 text-lg font-semibold text-orange-300">Demo Narrative</h2>
          <ul className="space-y-2 text-sm text-zinc-200">
            <li>Market drops across majors in one hour.</li>
            <li>MarketMind highlights relevant macro headline and risk reaction.</li>
            <li>System links ETF flows with sentiment shift and volatility spike.</li>
            <li>User gets actionable interpretation without auto-trading.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
