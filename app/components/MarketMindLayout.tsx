import Link from "next/link";
import { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Overview" },
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
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-orange-500/40 bg-zinc-950/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-7 py-7">
          <div>
            <p className="text-xs tracking-[0.35em] text-orange-400">MARKETMIND</p>
            <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
            <p className="text-sm text-zinc-400">{subtitle}</p>
          </div>
          <nav className="flex flex-wrap gap-2.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border border-orange-500/40 bg-black px-3.5 py-2 text-sm text-zinc-200 transition hover:border-orange-400 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-5 px-7 py-7 md:grid-cols-2">{children}</main>
    </div>
  );
}
