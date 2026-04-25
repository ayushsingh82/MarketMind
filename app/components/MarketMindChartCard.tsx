type MarketMindChartCardProps = {
  title: string;
  type: "multiline" | "candlestick" | "line" | "bar" | "timeline";
  note: string;
};

export default function MarketMindChartCard({ title, type, note }: MarketMindChartCardProps) {
  return (
    <div className="rounded-sm border border-zinc-700 bg-black p-4">
      <p className="text-sm text-orange-300">{title}</p>
      <p className="mb-2 text-xs text-zinc-500">{type.toUpperCase()}</p>
      <div className="grid min-h-28 place-items-center rounded-sm border border-zinc-800 bg-zinc-950 text-xs text-zinc-500">
        Chart placeholder
      </div>
      <p className="mt-3 text-xs text-zinc-400">{note}</p>
    </div>
  );
}
