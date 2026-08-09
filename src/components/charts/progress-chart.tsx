"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LoadUnit } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import { formatShortDate } from "@/lib/date";
import { formatVolume } from "@/lib/format";
import { formatWeight } from "@/lib/load-unit";
import { formatPercentChange, percentChange } from "@/lib/progression";
import type { ProgressPoint } from "@/server/services/exercise-history.service";

type MetricKey = "maxWeight" | "volumeKg" | "totalReps" | "bestSetVolumeKg" | "estimatedOneRepMax";

interface MetricConfig {
  key: MetricKey;
  label: string;
  format: (value: number, unit: LoadUnit) => string;
}

const METRICS: MetricConfig[] = [
  {
    key: "maxWeight",
    label: "Charge max",
    format: (value, unit) => formatWeight(value, unit) ?? String(value),
  },
  { key: "volumeKg", label: "Volume", format: (value) => formatVolume(value) },
  { key: "totalReps", label: "Répétitions", format: (value) => `${value} reps` },
  {
    key: "bestSetVolumeKg",
    label: "Meilleure série",
    format: (value) => formatVolume(value),
  },
  {
    key: "estimatedOneRepMax",
    label: "1RM estimé",
    format: (value, unit) => formatWeight(value, unit) ?? String(value),
  },
];

/**
 * Une seule mesure est tracée à la fois : superposer un volume en kilos et un
 * nombre de répétitions imposerait deux axes verticaux, ce qui rend une courbe
 * illisible et trompeuse. Le sélecteur remplace la superposition.
 */
export function ProgressChart({
  points,
  unit,
  className,
}: {
  points: ProgressPoint[];
  unit: LoadUnit;
  className?: string;
}) {
  const [metricKey, setMetricKey] = useState<MetricKey>("maxWeight");
  const metric = METRICS.find((entry) => entry.key === metricKey) ?? METRICS[0]!;

  const series = useMemo(
    () =>
      points
        .map((point) => ({
          timestamp: point.timestamp,
          label: formatShortDate(new Date(point.timestamp)),
          value: point[metric.key],
        }))
        .filter((point): point is { timestamp: number; label: string; value: number } =>
          point.value !== null && Number.isFinite(point.value),
        ),
    [points, metric.key],
  );

  const latest = series.at(-1);
  const first = series.at(0);
  const change =
    latest && first && series.length > 1 ? percentChange(latest.value, first.value) : null;

  if (series.length < 2) {
    return (
      <div className={cn("rounded-card border border-dashed border-border p-6", className)}>
        <p className="text-center text-sm text-fg-muted">
          Au moins deux séances sont nécessaires pour tracer une progression.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {METRICS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setMetricKey(entry.key)}
            aria-pressed={entry.key === metricKey}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              entry.key === metricKey
                ? "border-accent/40 bg-accent-soft text-accent"
                : "border-border bg-surface text-fg-muted hover:text-fg",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {/* Le chiffre du jour est lu bien plus souvent que la courbe :
          il est donc affiché en clair, la courbe donnant la tendance. */}
      <div className="mb-2 flex items-baseline gap-2.5">
        <p className="tabular text-3xl font-semibold leading-none">
          {latest ? metric.format(latest.value, unit) : "—"}
        </p>
        {change !== null ? (
          <p
            className={cn(
              "text-sm font-medium",
              change > 0 ? "text-success" : change < 0 ? "text-danger" : "text-fg-muted",
            )}
          >
            {formatPercentChange(change)}
            <span className="ml-1 text-xs font-normal text-fg-subtle">depuis le début</span>
          </p>
        ) : null}
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid
              vertical={false}
              stroke="var(--color-border)"
              strokeDasharray="3 3"
            />
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
              domain={["dataMin - 5", "dataMax + 5"]}
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
              formatter={(value) => [
                typeof value === "number" ? metric.format(value, unit) : String(value),
                metric.label,
              ]}
            />
            <Line
              type="monotone"
              dataKey="value"
              name={metric.label}
              stroke="var(--color-accent)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-accent)", strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: "var(--color-bg)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
