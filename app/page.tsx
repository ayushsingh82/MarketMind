import Link from "next/link";
import Dither from "./components/Dither";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-black text-white">
      <div className="absolute inset-0">
        <Dither
          waveColor={[0.95, 0.45, 0.15]}
          disableAnimation={false}
          enableMouseInteraction
          mouseRadius={0.5}
          colorNum={4}
          waveAmplitude={0.52}
          waveFrequency={4.2}
          waveSpeed={0.16}
        />
      </div>
      <div className="absolute inset-0 bg-black/55" />
      <section className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <h1 className="text-6xl font-black tracking-[0.12em] text-white sm:text-8xl">MarketMind</h1>
          <p className="mx-auto mt-6 max-w-3xl text-base font-medium leading-8 text-gray-300 sm:text-xl">
            AI market intelligence with multi-source reasoning, explainable insights, and live
            decision context.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="relative inline-block bg-[#f97316] px-8 py-4 text-base font-bold text-black transition duration-150 hover:bg-[#fb923c]"
            >
              Go To Dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
