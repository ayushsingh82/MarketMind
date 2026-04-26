type MarketMindChartCardProps = {
  title: string;
  type: "multiline" | "candlestick" | "line" | "bar" | "timeline";
  note: string;
};

export default function MarketMindChartCard({ title, type, note }: MarketMindChartCardProps) {
  return (
    <div className="relative border border-zinc-800 bg-[#141414] p-4">
      <span className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-orange-400" />
      <span className="absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-orange-400" />
      <span className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-orange-400" />
      <span className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-orange-400" />
      <p className="text-sm text-orange-300">{title}</p>
      <p className="mb-2 text-xs text-zinc-500">{type.toUpperCase()}</p>
      <div className="grid min-h-28 place-items-center border border-zinc-800 bg-black text-xs text-zinc-500">
        Chart placeholder
      </div>
      <p className="mt-3 text-xs text-zinc-400">{note}</p>
    </div>
  );
}
