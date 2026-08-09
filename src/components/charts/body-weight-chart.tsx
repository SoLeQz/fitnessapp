"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatShortDate } from "@/lib/date";

export function BodyWeightChart({
  points,
  unitSuffix,
}: {
  points: { timestamp: number; value: number }[];
  unitSuffix: string;
}) {
  if (points.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-fg-muted">
        Au moins deux pesées sont nécessaires pour tracer une courbe.
      </p>
    );
  }

  const data = points.map((point) => ({
    label: formatShortDate(new Date(point.timestamp)),
    value: point.value,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-fg-subtle)", fontSize: 11 }}
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-fg-subtle)", fontSize: 11 }}
            width={52}
            domain={["dataMin - 1", "dataMax + 1"]}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-border-strong)", strokeWidth: 1 }}
            contentStyle={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border-strong)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-fg-muted)" }}
            formatter={(value) => [`${String(value)} ${unitSuffix}`, "Poids"]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "var(--color-accent)", strokeWidth: 0 }}
            activeDot={{ r: 5, stroke: "var(--color-bg)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
