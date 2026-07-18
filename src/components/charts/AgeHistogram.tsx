"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_INK } from "@/lib/colors";
import type { AgeBucket } from "@/lib/fleetData";

export default function AgeHistogram({ data, color }: { data: AgeBucket[]; color: string }) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-400">No build-year data available.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: CHART_INK.muted }}
          axisLine={{ stroke: CHART_INK.axis }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: CHART_INK.muted }}
          axisLine={false}
          tickLine={false}
          width={40}
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
          formatter={(value) => [`${value} vessels`, "Built"]}
          labelFormatter={(label) => `Built ${label}`}
        />
        <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
