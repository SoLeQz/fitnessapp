"use client";

import { formatNumber, formatVolume } from "@/lib/format";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface BarDatum {
  label: string;
  value: number;
}

/**
 * Le formatage est désigné par un nom plutôt que par une fonction : une
 * fonction ne peut pas être transmise d'un Server Component à un composant
 * client.
 */
export type BarValueFormat = "count" | "volume";

const FORMATTERS: Record<BarValueFormat, (value: number) => string> = {
  count: (value) => formatNumber(value),
  volume: (value) => formatVolume(value),
};

/**
 * Histogramme à une seule mesure. Les extrémités sont arrondies et ancrées à la
 * ligne de base, la grille reste discrète pour que ce soient les barres, et non
 * le cadre, qui portent la lecture.
 */
export function SimpleBarChart({
  data,
  format = "count",
  valueLabel,
  height = 200,
  highlightLast = true,
}: {
  data: BarDatum[];
  format?: BarValueFormat;
  valueLabel: string;
  height?: number;
  highlightLast?: boolean;
}) {
  const formatValue = FORMATTERS[format];

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-fg-muted">Pas encore de données.</p>;
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-fg-subtle)", fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-fg-subtle)", fontSize: 11 }}
            width={48}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "var(--color-surface-hover)" }}
            contentStyle={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border-strong)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-fg-muted)" }}
            formatter={(value) => [
              typeof value === "number" ? formatValue(value) : String(value),
              valueLabel,
            ]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((entry, index) => (
              <Cell
                key={entry.label}
                // La période en cours est mise en avant : c'est celle que l'on
                // vient chercher du regard.
                fill={
                  highlightLast && index === data.length - 1
                    ? "var(--color-accent)"
                    : "var(--color-border-strong)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
