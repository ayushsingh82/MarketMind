"use client";

import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

type MarketMindChartCardProps = {
  title: string;
  type: "multiline" | "candlestick" | "line" | "bar" | "timeline" | "heatmap" | "correlation";
  note: string;
};

export default function MarketMindChartCard({ title, type, note }: MarketMindChartCardProps) {
  const marketSeries = [
    { t: "Mon", btc: 100, eth: 100, index: 100 },
    { t: "Tue", btc: 99, eth: 101.4, index: 100.3 },
    { t: "Wed", btc: 98.6, eth: 102.6, index: 100.6 },
    { t: "Thu", btc: 99.2, eth: 103.2, index: 100.9 },
    { t: "Fri", btc: 100.1, eth: 104.1, index: 101.1 },
    { t: "Sat", btc: 101.4, eth: 104.8, index: 101.5 },
    { t: "Sun", btc: 100.8, eth: 105.3, index: 101.7 },
  ];
  const sentiment = [
    { t: "8", bull: 48, bear: 34 },
    { t: "10", bull: 51, bear: 33 },
    { t: "12", bull: 56, bear: 29 },
    { t: "14", bull: 59, bear: 27 },
    { t: "16", bull: 54, bear: 32 },
    { t: "18", bull: 61, bear: 25 },
  ];
  const timeline = [
    { t: "09:00", impact: 18 },
    { t: "11:00", impact: 42 },
    { t: "13:00", impact: 33 },
    { t: "15:00", impact: 57 },
    { t: "17:00", impact: 29 },
  ];
  const sectorHeat = [
    { x: 1, y: 1, z: 89 },
    { x: 2, y: 1, z: 72 },
    { x: 3, y: 1, z: 51 },
    { x: 1, y: 2, z: 64 },
    { x: 2, y: 2, z: 38 },
    { x: 3, y: 2, z: 77 },
  ];
  const correlation = [
    { x: 0.2, y: 0.4, z: 100 },
    { x: 0.4, y: 0.53, z: 120 },
    { x: 0.5, y: 0.62, z: 140 },
    { x: 0.7, y: 0.73, z: 170 },
    { x: 0.9, y: 0.85, z: 190 },
  ];
  const axisStyle = { tick: { fill: "#a1a1aa", fontSize: 11 }, axisLine: false, tickLine: false };
  const chart = {
    multiline: (
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={marketSeries}>
          <XAxis dataKey="t" {...axisStyle} />
          <YAxis {...axisStyle} />
          <Tooltip />
          <Line dataKey="btc" stroke="#f97316" dot={false} strokeWidth={2} />
          <Line dataKey="eth" stroke="#fb923c" dot={false} strokeWidth={2.5} />
          <Line dataKey="index" stroke="#a1a1aa" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    ),
    line: (
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={sentiment}>
          <XAxis dataKey="t" {...axisStyle} />
          <YAxis {...axisStyle} />
          <Tooltip />
          <Area type="monotone" dataKey="bull" stroke="#f97316" fill="#f97316" fillOpacity={0.25} />
          <Area type="monotone" dataKey="bear" stroke="#52525b" fill="#52525b" fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    ),
    timeline: (
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={timeline}>
          <XAxis dataKey="t" {...axisStyle} />
          <YAxis {...axisStyle} />
          <Tooltip />
          <Line dataKey="impact" stroke="#fb923c" strokeWidth={2.5} />
        </LineChart>
      </ResponsiveContainer>
    ),
    bar: (
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={timeline}>
          <XAxis dataKey="t" {...axisStyle} />
          <YAxis {...axisStyle} />
          <Tooltip />
          <Line dataKey="impact" stroke="#f97316" strokeWidth={2.5} />
        </LineChart>
      </ResponsiveContainer>
    ),
    candlestick: (
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={marketSeries}>
          <XAxis dataKey="t" {...axisStyle} />
          <YAxis {...axisStyle} />
          <Tooltip />
          <Line dataKey="eth" stroke="#f97316" strokeWidth={2.5} />
        </LineChart>
      </ResponsiveContainer>
    ),
    heatmap: (
      <ResponsiveContainer width="100%" height={180}>
        <ScatterChart>
          <XAxis dataKey="x" type="number" name="Sector" {...axisStyle} />
          <YAxis dataKey="y" type="number" name="Window" {...axisStyle} />
          <ZAxis dataKey="z" range={[70, 320]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={sectorHeat} fill="#f97316" />
        </ScatterChart>
      </ResponsiveContainer>
    ),
    correlation: (
      <ResponsiveContainer width="100%" height={180}>
        <ScatterChart>
          <XAxis dataKey="x" type="number" name="BTC Move" {...axisStyle} />
          <YAxis dataKey="y" type="number" name="ETH Move" {...axisStyle} />
          <ZAxis dataKey="z" range={[80, 250]} />
          <Tooltip />
          <Scatter data={correlation} fill="#fb923c" />
        </ScatterChart>
      </ResponsiveContainer>
    ),
  }[type];

  return (
    <div className="relative border border-zinc-800 bg-[#141414] p-4">
      <span className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-orange-400" />
      <span className="absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-orange-400" />
      <span className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-orange-400" />
      <span className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-orange-400" />
      <p className="text-sm text-orange-300">{title}</p>
      <p className="mb-2 text-xs text-zinc-500">{type.toUpperCase()}</p>
      <div className="grid min-h-44 place-items-center border border-zinc-800 bg-black text-xs text-zinc-500">{chart}</div>
      <p className="mt-3 text-xs text-zinc-400">{note}</p>
    </div>
  );
}
