import Link from "next/link";
import { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/ask", label: "Ask the Market" },
  { href: "/asset", label: "Asset Analysis" },
  { href: "/insights", label: "Personalized Insights" },
  { href: "/news", label: "News Intelligence" },
  { href: "/sectors", label: "Sector Explorer" },
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
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6">
          <div>
            <p className="text-xs tracking-[0.35em] text-orange-400">MARKETMIND</p>
            <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
            <p className="text-sm text-zinc-400">{subtitle}</p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border border-orange-500/40 bg-black px-3 py-2 text-sm text-zinc-200 transition hover:border-orange-400 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-4 px-6 py-6 md:grid-cols-2">{children}</main>
    </div>
  );
}
