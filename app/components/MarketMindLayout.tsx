"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Dither from "./Dither";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/ask", label: "Ask Market" },
  { href: "/asset", label: "Assets" },
  { href: "/insights", label: "Personalized Insights" },
  { href: "/news", label: "News Intelligence" },
  { href: "/sectors", label: "Trends" },
  { href: "/watchlist", label: "Watchlist" },
];

type MarketMindLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function MarketMindLayout({
  title,
  subtitle,
  children,
}: MarketMindLayoutProps) {
  const pathname = usePathname();
  return (
    <div className="relative flex h-screen bg-black text-white">
      <div className="absolute inset-0">
        <Dither
          waveColor={[0.95, 0.45, 0.15]}
          disableAnimation={false}
          enableMouseInteraction
          mouseRadius={0.4}
          colorNum={4}
          waveAmplitude={0.42}
          waveFrequency={3.8}
          waveSpeed={0.12}
        />
      </div>
      <div className="absolute inset-0 bg-black/65" />

      <div className="relative z-10 flex h-screen w-full">
      <aside className="w-64 border-r border-zinc-800 bg-black">
        <div className="border-b border-zinc-800 p-6">
          <Link href="/" className="text-2xl font-black text-white transition hover:text-[#f97316]">
            MarketMind
          </Link>
          <p className="mt-2 text-xs text-zinc-500">AI Market Intelligence Engine</p>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 text-xs font-medium transition ${
                pathname === item.href
                  ? "bg-[#f97316] text-black"
                  : "border border-zinc-800 bg-[#141414] text-zinc-200 hover:border-[#f97316] hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 overflow-auto bg-black p-8">
        <header className="relative border border-zinc-800 bg-[#141414] px-6 py-5">
          <span className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-[#f97316]" />
          <span className="absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-[#f97316]" />
          <span className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-[#f97316]" />
          <span className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-[#f97316]" />
          <div>
            <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
            <p className="text-sm text-zinc-400">{subtitle}</p>
          </div>
        </header>
        <main className="mt-4 grid gap-4 md:grid-cols-2">{children}</main>
      </div>
      </div>
    </div>
  );
}
