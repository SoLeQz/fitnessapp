import type { LoadUnit, PersonalRecordType } from "@/generated/prisma/enums";
import { WorkoutStatus } from "@/generated/prisma/enums";
import { compareSessions, type ProgressionComparison } from "@/lib/progression";
import {
  bestEstimatedOneRepMax,
  bestSet,
  heaviestWeight,
  maxReps,
  setVolumeKg,
  totalReps,
  totalVolumeKg,
  type SetMetrics,
} from "@/lib/set-metrics";
import { prisma } from "@/server/db";
import { decimalToNumber } from "@/server/prisma-utils";
import { summarizeSets, toSetView, WORKOUT_SET_SELECT, type WorkoutSetView } from "./workout-view";
import { SET_METRICS_SELECT, toSetMetrics } from "./workout-stats.service";

/** Une séance de l'historique d'un exercice. */
export interface HistorySession {
  workoutId: string;
  workoutName: string;
  performedAt: Date;
  variant: { id: string; label: string } | null;
  sets: WorkoutSetView[];
  summary: string;
  volumeKg: number;
  totalReps: number;
  bestWeight: number | null;
  bestReps: number | null;
  estimatedOneRepMax: number | null;
}

export interface ExerciseStats {
  sessionCount: number;
  totalVolumeKg: number;
  totalSets: number;
  bestWeight: number | null;
  bestReps: number | null;
  bestSetVolumeKg: number | null;
  bestEstimatedOneRepMax: number | null;
  unit: LoadUnit;
  /** Comparaison des deux dernières séances. */
  progression: ProgressionComparison | null;
  /** Meilleur nombre de répétitions atteint à chaque charge travaillée. */
  repsByWeight: { weight: number; reps: number; unit: LoadUnit }[];
  records: {
    type: PersonalRecordType;
    value: number;
    weight: number | null;
    weightUnit: LoadUnit | null;
    reps: number | null;
    achievedAt: Date;
  }[];
}

/** Point de graphique : une séance. */
export interface ProgressPoint {
  date: string;
  timestamp: number;
  maxWeight: number | null;
  volumeKg: number;
  totalReps: number;
  bestSetVolumeKg: number | null;
  estimatedOneRepMax: number | null;
}

/**
 * Historique complet d'un exercice, séance par séance, de la plus récente à la
 * plus ancienne. `variantId` permet de n'afficher qu'une machine : c'est
 * nécessaire dès que deux machines n'utilisent pas la même unité.
 */
export async function getExerciseHistory(
  userId: string,
  exerciseId: string,
  variantId?: string | null,
  limit = 60,
): Promise<HistorySession[]> {
  const entries = await prisma.workoutExercise.findMany({
    where: {
      exerciseId,
      ...(variantId !== undefined ? { variantId } : {}),
      workout: { userId, status: WorkoutStatus.COMPLETED },
      sets: { some: {} },
    },
    orderBy: { workout: { startedAt: "desc" } },
    take: limit,
    select: {
      workoutId: true,
      workout: { select: { name: true, startedAt: true } },
      variant: { select: { id: true, label: true } },
      sets: { orderBy: { setNumber: "asc" }, select: WORKOUT_SET_SELECT },
    },
  });

  return entries.map((entry) => {
    const views = entry.sets.map(toSetView);
    const metrics: SetMetrics[] = views.map((set) => ({
      weight: set.weight,
      weightUnit: set.weightUnit,
      weightKg: set.weightKg,
      reps: set.reps,
      durationSeconds: set.durationSeconds,
      distanceMeters: set.distanceMeters,
      isWarmup: set.isWarmup,
      isCompleted: set.isCompleted,
    }));

    const working = views.filter((set) => set.isCompleted && !set.isWarmup);

    return {
      workoutId: entry.workoutId,
      workoutName: entry.workout.name,
      performedAt: entry.workout.startedAt,
      variant: entry.variant,
      sets: views,
      summary: summarizeSets(
        working.map((set) => ({
          weight: set.weight,
          weightUnit: set.weightUnit,
          reps: set.reps,
        })),
      ),
      volumeKg: totalVolumeKg(metrics),
      totalReps: totalReps(metrics),
      bestWeight: heaviestWeight(metrics),
      bestReps: maxReps(metrics),
      estimatedOneRepMax: bestEstimatedOneRepMax(metrics),
    };
  });
}

/** Séries de points pour les graphiques, de la plus ancienne à la plus récente. */
export function toProgressPoints(sessions: readonly HistorySession[]): ProgressPoint[] {
  return [...sessions]
    .reverse()
    .map((session) => ({
      date: session.performedAt.toISOString(),
      timestamp: session.performedAt.getTime(),
      maxWeight: session.bestWeight,
      volumeKg: session.volumeKg,
      totalReps: session.totalReps,
      bestSetVolumeKg: bestSetVolume(session),
      estimatedOneRepMax: session.estimatedOneRepMax,
    }));
}

function bestSetVolume(session: HistorySession): number | null {
  let best: number | null = null;
  for (const set of session.sets) {
    if (!set.isCompleted || set.isWarmup) continue;
    const volume = setVolumeKg({
      weight: set.weight,
      weightUnit: set.weightUnit,
      weightKg: set.weightKg,
      reps: set.reps,
      durationSeconds: set.durationSeconds,
      distanceMeters: set.distanceMeters,
      isWarmup: set.isWarmup,
      isCompleted: set.isCompleted,
    });
    if (volume !== null && (best === null || volume > best)) best = volume;
  }
  return best;
}

/**
 * Statistiques agrégées d'un exercice : records, cumuls, progression entre les
 * deux dernières séances, et meilleur nombre de répétitions par charge.
 */
export async function getExerciseStats(
  userId: string,
  exerciseId: string,
  variantId?: string | null,
): Promise<ExerciseStats> {
  const rows = await prisma.workoutSet.findMany({
    where: {
      isCompleted: true,
      isWarmup: false,
      workoutExercise: {
        exerciseId,
        ...(variantId !== undefined ? { variantId } : {}),
        workout: { userId, status: WorkoutStatus.COMPLETED },
      },
    },
    orderBy: { workoutExercise: { workout: { startedAt: "desc" } } },
    select: {
      ...SET_METRICS_SELECT,
      workoutExercise: {
        select: { workoutId: true, workout: { select: { startedAt: true } } },
      },
    },
  });

  const allMetrics = rows.map((row) => toSetMetrics(row));

  // Regroupement par séance, pour comparer les deux dernières entre elles.
  const byWorkout = new Map<string, { startedAt: Date; sets: SetMetrics[] }>();
  for (const row of rows) {
    const key = row.workoutExercise.workoutId;
    const bucket = byWorkout.get(key);
    const metrics = toSetMetrics(row);
    if (bucket) bucket.sets.push(metrics);
    else byWorkout.set(key, { startedAt: row.workoutExercise.workout.startedAt, sets: [metrics] });
  }

  const sessions = [...byWorkout.values()].sort(
    (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
  );

  const latest = sessions[0];
  const previous = sessions[1];
  const progression =
    latest && previous ? compareSessions(latest.sets, previous.sets) : null;

  // Meilleures répétitions atteintes à chaque charge : lecture directe de la
  // question « combien de reps je fais à 65 kg ? ».
  const repsAtWeight = new Map<number, number>();
  for (const metrics of allMetrics) {
    if (metrics.weight === null || metrics.reps === null) continue;
    const current = repsAtWeight.get(metrics.weight);
    if (current === undefined || metrics.reps > current) {
      repsAtWeight.set(metrics.weight, metrics.reps);
    }
  }

  const unit = allMetrics[0]?.weightUnit ?? "KG";

  const bestSetOverall = bestSet(allMetrics);
  const bestSetVolumeKg = bestSetOverall ? setVolumeKg(bestSetOverall) : null;

  const records = await prisma.personalRecord.findMany({
    where: {
      userId,
      exerciseId,
      ...(variantId !== undefined ? { variantId } : {}),
    },
    orderBy: { type: "asc" },
    select: {
      type: true,
      value: true,
      weight: true,
      weightUnit: true,
      reps: true,
      achievedAt: true,
    },
  });

  return {
    sessionCount: sessions.length,
    totalVolumeKg: totalVolumeKg(allMetrics),
    totalSets: allMetrics.length,
    bestWeight: heaviestWeight(allMetrics),
    bestReps: maxReps(allMetrics),
    bestSetVolumeKg,
    bestEstimatedOneRepMax: bestEstimatedOneRepMax(allMetrics),
    unit,
    progression,
    repsByWeight: [...repsAtWeight.entries()]
      .sort((a, b) => b[0] - a[0])
      .slice(0, 8)
      .map(([weight, reps]) => ({ weight, reps, unit })),
    records: records.map((record) => ({
      type: record.type,
      value: decimalToNumber(record.value) ?? 0,
      weight: decimalToNumber(record.weight),
      weightUnit: record.weightUnit,
      reps: record.reps,
      achievedAt: record.achievedAt,
    })),
  };
}
