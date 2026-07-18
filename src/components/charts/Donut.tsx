"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_CATEGORICAL, CHART_INK } from "@/lib/colors";
import type { ChartPoint } from "@/lib/analytics";

interface DonutProps {
  data: ChartPoint[];
  unit: string;
  height?: number;
}

/** Donut chart with legend for categorical shares (sub-types, age bands). */
export default function Donut({ data, unit, height = 260 }: DonutProps) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <p className="text-sm text-slate-400">No data available.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          stroke="none"
        >
          {data.map((d, i) => (
            <Cell
              key={d.label}
              fill={d.label === "Other" ? "#94a3b8" : CHART_CATEGORICAL[i % CHART_CATEGORICAL.length]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 6,
            backgroundColor: CHART_INK.surface,
            border: `1px solid ${CHART_INK.grid}`,
            color: CHART_INK.primary,
          }}
          formatter={(value, name) => [`${Number(value).toLocaleString()} ${unit}`, name]}
        />
        <Legend
          formatter={(value) => <span style={{ color: CHART_INK.secondary, fontSize: 12 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
