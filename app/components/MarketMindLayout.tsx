"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

const navSections: { label: string; items: { href: string; label: string; tag?: string }[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Intelligence Board", tag: "00" },
      { href: "/ask", label: "Ask Market", tag: "01" },
    ],
  },
  {
    label: "Signals",
    items: [
      { href: "/news", label: "News Impact", tag: "10" },
      { href: "/sectors", label: "Sectors & Narratives", tag: "11" },
      { href: "/sodex-flow", label: "SoDEX Flow", tag: "12" },
      { href: "/staking", label: "Staking & Yield", tag: "13" },
      { href: "/ssi", label: "SSI Indices", tag: "14" },
    ],
  },
  {
    label: "Personal",
    items: [
      { href: "/asset", label: "Asset Deep-Dive", tag: "20" },
      { href: "/insights", label: "Personal Insights", tag: "21" },
      { href: "/watchlist", label: "Watchlist", tag: "22" },
    ],
  },
];

type MarketMindLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  density?: "grid" | "stack";
};

// MarketMind layout intentionally drops the corner-bracket header style and
// uses a sectioned terminal-style sidebar with code tags + a top status rail.

export default function MarketMindLayout({
  title,
  subtitle,
  children,
  density = "grid",
}: MarketMindLayoutProps) {
  const pathname = usePathname();
  return (
    <div className="relative min-h-screen bg-[#050507] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 0%, rgba(249,115,22,0.14), transparent 50%), radial-gradient(circle at 80% 100%, rgba(249,115,22,0.08), transparent 60%), linear-gradient(to bottom, transparent 0%, rgba(249,115,22,0.02) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(249,115,22,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.6) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 flex min-h-screen w-full">
        <aside className="hidden w-64 shrink-0 border-r border-zinc-900 bg-[#070709] md:block">
          <div className="border-b border-zinc-900 p-5">
            <Link href="/" className="block">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#f97316]">mm·</span>
                <span className="text-lg font-bold tracking-[0.18em] text-white">MARKETMIND</span>
              </div>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-600">
                cause · effect · evidence
              </p>
            </Link>
          </div>
          <nav className="flex flex-col gap-5 p-4 text-xs">
            {navSections.map((section) => (
              <div key={section.label}>
                <p className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-600">
                  {section.label}
                </p>
                <div className="flex flex-col gap-1">
                  {section.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex items-center justify-between rounded-sm border px-3 py-2 transition ${
                          active
                            ? "border-[#f97316] bg-[#f97316]/15 text-white"
                            : "border-zinc-900 bg-[#0c0c0e] text-zinc-300 hover:border-[#f97316]/60 hover:text-white"
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        <span className={`font-mono text-[10px] tracking-wider ${active ? "text-[#f97316]" : "text-zinc-600 group-hover:text-[#f97316]"}`}>
                          {item.tag}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex flex-1 flex-col overflow-x-hidden">
          <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 bg-[#050507]/80 px-6 py-4 backdrop-blur">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#f97316]">/ {title}</p>
              <h1 className="text-xl font-semibold text-white md:text-2xl">{subtitle}</h1>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              session · ingestion-live
            </div>
          </header>
          <main
            className={`flex-1 px-6 py-6 ${
              density === "grid"
                ? "grid auto-rows-min content-start items-start gap-4 md:grid-cols-6"
                : "space-y-4"
            }`}
          >
            {children}
          </main>
          <footer className="mt-auto border-t border-zinc-900 px-6 py-3 font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-600">
            marketmind · sosovalue buildathon · read-only intelligence layer
          </footer>
        </div>
      </div>
    </div>
  );
}
