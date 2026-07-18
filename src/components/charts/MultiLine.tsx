"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_INK } from "@/lib/colors";

export interface MultiLineSeries {
  name: string;
  color: string;
  /** Values aligned with the shared `labels` array. */
  values: number[];
}

interface MultiLineProps {
  labels: string[];
  series: MultiLineSeries[];
  unit: string;
  height?: number;
}

/** Multi-series line chart over shared x labels (e.g. deliveries by year per segment). */
export default function MultiLine({ labels, series, unit, height = 280 }: MultiLineProps) {
  if (labels.length === 0 || series.length === 0) {
    return <p className="text-sm text-slate-400">No data available.</p>;
  }
  const data = labels.map((label, i) => {
    const row: Record<string, string | number> = { label };
    for (const s of series) row[s.name] = s.values[i] ?? 0;
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
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
          contentStyle={{
            fontSize: 12,
            borderRadius: 6,
            backgroundColor: CHART_INK.surface,
            border: `1px solid ${CHART_INK.grid}`,
            color: CHART_INK.primary,
          }}
          labelStyle={{ color: CHART_INK.secondary }}
          formatter={(value, name) => [`${Number(value).toLocaleString()} ${unit}`, name]}
        />
        <Legend
          formatter={(value) => <span style={{ color: CHART_INK.secondary, fontSize: 12 }}>{value}</span>}
        />
        {series.map((s) => (
          <Line
            key={s.name}
            type="monotone"
            dataKey={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
