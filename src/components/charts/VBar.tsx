"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_INK } from "@/lib/colors";
import type { ChartPoint } from "@/lib/analytics";

interface VBarProps {
  data: ChartPoint[];
  color: string;
  /** Noun used in the tooltip, e.g. "vessels", "COIs expiring". */
  unit: string;
  height?: number;
}

/** Generic vertical bar chart on the dark surface. */
export default function VBar({ data, color, unit, height = 260 }: VBarProps) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-400">No data available.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: CHART_INK.muted }}
          axisLine={{ stroke: CHART_INK.axis }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          cursor={{ fill: "rgba(148,163,184,0.12)" }}
          contentStyle={{
            fontSize: 12,
            borderRadius: 6,
            backgroundColor: CHART_INK.surface,
            border: `1px solid ${CHART_INK.grid}`,
            color: CHART_INK.primary,
          }}
          labelStyle={{ color: CHART_INK.secondary }}
          formatter={(value) => [`${Number(value).toLocaleString()} ${unit}`, ""]}
        />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
