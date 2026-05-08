import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050507] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 12%, rgba(249,115,22,0.22), transparent 55%), radial-gradient(circle at 82% 88%, rgba(249,115,22,0.12), transparent 60%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(249,115,22,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.6) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f97316]/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#f97316]/30 to-transparent" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.4em] text-[#f97316]">mm·</span>
          <span className="text-base font-bold tracking-[0.18em]">MARKETMIND</span>
        </div>
        <nav className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
          <span className="hidden md:inline">cause · effect · evidence</span>
          <Link href="/dashboard" className="text-zinc-300 transition hover:text-white">
            dashboard →
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-20 pt-12 md:px-10 md:pt-20">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-400">
            session · ingestion-live · sosovalue · sodex · ssi
          </p>
        </div>

        <h1 className="text-5xl font-black leading-[1.04] tracking-tight md:text-7xl">
          The <span className="text-[#f97316]">why</span> behind the move,
          <br />
          cited and <span className="text-[#f97316]">contradiction-checked</span>.
        </h1>

        <p className="max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
          MarketMind is a read-only research desk for crypto. It joins SoSoValue news, market,
          sectors, macro, and SSI baskets with SoDEX microstructure to explain market moves in
          plain language — every claim cited, every cross-source disagreement surfaced, nothing
          auto-traded.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-sm border border-[#f97316] bg-[#f97316] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#fb923c]"
          >
            Open intelligence board
            <span className="font-mono text-[10px] tracking-widest">→</span>
          </Link>
          <Link
            href="/ask"
            className="inline-flex items-center gap-2 rounded-sm border border-zinc-700 bg-[#0c0c0e] px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:border-[#f97316] hover:text-white"
          >
            Ask the market
            <span className="font-mono text-[10px] tracking-widest text-[#f97316]">/</span>
          </Link>
          <a
            href="https://github.com/ayushsingh82/MarketMind"
            className="inline-flex items-center gap-2 px-2 py-3 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 hover:text-white"
          >
            github ↗
          </a>
        </div>

        {/* Pillars row — distinct from the AutoFund "pipeline pillars" */}
        <div className="mt-10 grid gap-3 md:grid-cols-4">
          {PILLARS.map((p) => (
            <article
              key={p.tag}
              className="group relative overflow-hidden rounded-sm border border-zinc-800/80 bg-gradient-to-b from-[#0d0d10] to-[#070708] p-4"
            >
              <div className="pointer-events-none absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-[#f97316]/0 via-[#f97316]/70 to-[#f97316]/0" />
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#f97316]">{p.tag}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-zinc-500">{p.kind}</span>
              </div>
              <h3 className="mt-2 text-sm font-semibold text-white">{p.title}</h3>
              <p className="mt-1 text-[12px] leading-5 text-zinc-400">{p.body}</p>
            </article>
          ))}
        </div>

        {/* Distinguishing strip — read-only intelligence positioning */}
        <div className="mt-2 grid gap-3 rounded-sm border border-zinc-800/80 bg-[#0a0a0c] p-5 md:grid-cols-3">
          {DIFFS.map((d) => (
            <div key={d.label} className="border-r border-zinc-800/70 px-4 last:border-r-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500">{d.label}</p>
              <p className="mt-1 text-sm leading-6 text-zinc-200">{d.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
          <span>built for</span>
          <span className="text-[#f97316]">sosovalue buildathon · wave 1</span>
          <span className="text-zinc-700">|</span>
          <span>16 api routes</span>
          <span className="text-zinc-700">·</span>
          <span>11 live pages</span>
          <span className="text-zinc-700">·</span>
          <span>read-only by design</span>
        </div>
      </section>
    </main>
  );
}

const PILLARS: { tag: string; kind: string; title: string; body: string }[] = [
  {
    tag: "00",
    kind: "ingest",
    title: "Five SoSoValue feeds",
    body: "News · market snapshot · sector spotlight · macro events · SSI index baskets — fan-out, no-store, every read fresh.",
  },
  {
    tag: "01",
    kind: "correlate",
    title: "Cause-effect engine",
    body: "Each headline gets a measured price reaction window and decay half-life — not a vibe, a number you can cite.",
  },
  {
    tag: "10",
    kind: "verify",
    title: "Contradiction stack",
    body: "When news bias says one thing and sector breadth says another, MarketMind names it instead of hiding it.",
  },
  {
    tag: "11",
    kind: "explain",
    title: "Ask Market",
    body: "Plain-language thesis with cited evidence, contradictions, and a confidence score — not auto-trade signals.",
  },
];

const DIFFS: { label: string; body: string }[] = [
  {
    label: "what it is",
    body: "An analyst layer that explains why the market is doing what it's doing — citing news, breadth, macro, and SoDEX flow.",
  },
  {
    label: "what it isn't",
    body: "Not a fund agent. MarketMind never sends an order, signs a transaction, or rebalances an SSI basket.",
  },
  {
    label: "who it's for",
    body: "Retail traders, journalists, DAO research desks, and fund managers who can't or won't delegate execution but still need a real-time second opinion.",
  },
];
