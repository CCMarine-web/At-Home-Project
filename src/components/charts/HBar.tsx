"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_INK } from "@/lib/colors";
import type { ChartPoint } from "@/lib/analytics";

interface HBarProps {
  data: ChartPoint[];
  color: string;
  unit: string;
  /** Row height in px; total chart height scales with the row count. */
  rowHeight?: number;
}

/** Horizontal bar chart for rankings (operator fleets, size classes). */
export default function HBar({ data, color, unit, rowHeight = 28 }: HBarProps) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-400">No data available.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={data.length * rowHeight + 40}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={CHART_INK.grid} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: CHART_INK.muted }}
          axisLine={{ stroke: CHART_INK.axis }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 11, fill: CHART_INK.secondary }}
          axisLine={false}
          tickLine={false}
          width={96}
        />
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
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
