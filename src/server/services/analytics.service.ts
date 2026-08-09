import {
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { fr } from "date-fns/locale";
import type { LoadUnit, MuscleGroup, PersonalRecordType } from "@/generated/prisma/enums";
import { WorkoutStatus } from "@/generated/prisma/enums";
import { setVolumeKg } from "@/lib/set-metrics";
import { prisma } from "@/server/db";
import { decimalToNumber } from "@/server/prisma-utils";
import { SET_METRICS_SELECT, toSetMetrics } from "./workout-stats.service";

/** La semaine commence le lundi, comme les programmes d'entraînement. */
const WEEK_OPTIONS = { weekStartsOn: 1 as const, locale: fr };

export interface DashboardSummary {
  workoutsThisWeek: number;
  workoutsThisMonth: number;
  totalWorkouts: number;
  totalVolumeKg: number;
  totalTrainingSeconds: number;
  averageDurationSeconds: number | null;
  lastWorkout: {
    id: string;
    name: string;
    startedAt: Date;
    totalVolumeKg: number;
    totalSets: number;
    durationSeconds: number | null;
    exerciseNames: string[];
  } | null;
  /** Prochain jour du programme, déduit de celui travaillé le moins récemment. */
  nextProgramDay: { id: string; name: string; programName: string; lastPerformedAt: Date | null } | null;
  topExercises: { id: string; name: string; sessionCount: number }[];
  recentRecords: RecordEntry[];
}

export interface RecordEntry {
  id: string;
  type: PersonalRecordType;
  value: number;
  weight: number | null;
  weightUnit: LoadUnit | null;
  reps: number | null;
  achievedAt: Date;
  exercise: { id: string; name: string };
  variantLabel: string | null;
}

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const now = new Date();
  const weekStart = startOfWeek(now, WEEK_OPTIONS);
  const monthStart = startOfMonth(now);

  const [weekCount, monthCount, totals, lastWorkout, topExercises, recentRecords, nextProgramDay] =
    await Promise.all([
      prisma.workout.count({
        where: { userId, status: WorkoutStatus.COMPLETED, startedAt: { gte: weekStart } },
      }),
      prisma.workout.count({
        where: { userId, status: WorkoutStatus.COMPLETED, startedAt: { gte: monthStart } },
      }),
      prisma.workout.aggregate({
        where: { userId, status: WorkoutStatus.COMPLETED },
        _count: { id: true },
        _sum: { totalVolumeKg: true, durationSeconds: true },
        _avg: { durationSeconds: true },
      }),
      prisma.workout.findFirst({
        where: { userId, status: WorkoutStatus.COMPLETED },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          name: true,
          startedAt: true,
          totalVolumeKg: true,
          totalSets: true,
          durationSeconds: true,
          exercises: {
            orderBy: { position: "asc" },
            select: { exercise: { select: { name: true } } },
          },
        },
      }),
      getTopExercises(userId, 5),
      getRecentRecords(userId, 5),
      getNextProgramDay(userId),
    ]);

  return {
    workoutsThisWeek: weekCount,
    workoutsThisMonth: monthCount,
    totalWorkouts: totals._count.id,
    totalVolumeKg: decimalToNumber(totals._sum.totalVolumeKg) ?? 0,
    totalTrainingSeconds: totals._sum.durationSeconds ?? 0,
    averageDurationSeconds: totals._avg.durationSeconds ?? null,
    lastWorkout: lastWorkout
      ? {
          id: lastWorkout.id,
          name: lastWorkout.name,
          startedAt: lastWorkout.startedAt,
          totalVolumeKg: decimalToNumber(lastWorkout.totalVolumeKg) ?? 0,
          totalSets: lastWorkout.totalSets,
          durationSeconds: lastWorkout.durationSeconds,
          exerciseNames: lastWorkout.exercises.map((entry) => entry.exercise.name),
        }
      : null,
    nextProgramDay,
    topExercises,
    recentRecords,
  };
}

async function getTopExercises(
  userId: string,
  limit: number,
): Promise<{ id: string; name: string; sessionCount: number }[]> {
  const grouped = await prisma.workoutExercise.groupBy({
    by: ["exerciseId"],
    where: { workout: { userId, status: WorkoutStatus.COMPLETED } },
    _count: { exerciseId: true },
    orderBy: { _count: { exerciseId: "desc" } },
    take: limit,
  });

  if (grouped.length === 0) return [];

  const exercises = await prisma.exercise.findMany({
    where: { id: { in: grouped.map((row) => row.exerciseId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));

  return grouped.map((row) => ({
    id: row.exerciseId,
    name: nameById.get(row.exerciseId) ?? "Exercice supprimé",
    sessionCount: row._count.exerciseId,
  }));
}

export async function getRecentRecords(userId: string, limit: number): Promise<RecordEntry[]> {
  const records = await prisma.personalRecord.findMany({
    where: { userId },
    orderBy: [{ achievedAt: "desc" }, { value: "desc" }],
    take: limit,
    select: {
      id: true,
      type: true,
      value: true,
      weight: true,
      weightUnit: true,
      reps: true,
      achievedAt: true,
      exercise: { select: { id: true, name: true } },
      variant: { select: { label: true } },
    },
  });

  return records.map((record) => ({
    id: record.id,
    type: record.type,
    value: decimalToNumber(record.value) ?? 0,
    weight: decimalToNumber(record.weight),
    weightUnit: record.weightUnit,
    reps: record.reps,
    achievedAt: record.achievedAt,
    exercise: record.exercise,
    variantLabel: record.variant?.label ?? null,
  }));
}

/** Tous les records, groupés par exercice, pour la page dédiée. */
export async function getAllRecords(userId: string): Promise<RecordEntry[]> {
  const records = await prisma.personalRecord.findMany({
    where: { userId },
    orderBy: [{ exercise: { name: "asc" } }, { type: "asc" }],
    select: {
      id: true,
      type: true,
      value: true,
      weight: true,
      weightUnit: true,
      reps: true,
      achievedAt: true,
      exercise: { select: { id: true, name: true } },
      variant: { select: { label: true } },
    },
  });

  return records.map((record) => ({
    id: record.id,
    type: record.type,
    value: decimalToNumber(record.value) ?? 0,
    weight: decimalToNumber(record.weight),
    weightUnit: record.weightUnit,
    reps: record.reps,
    achievedAt: record.achievedAt,
    exercise: record.exercise,
    variantLabel: record.variant?.label ?? null,
  }));
}

/**
 * Prochain jour suggéré : celui du programme actif travaillé le moins
 * récemment. C'est une simple rotation constatée, pas une prescription.
 */
async function getNextProgramDay(
  userId: string,
): Promise<DashboardSummary["nextProgramDay"]> {
  const program = await prisma.workoutProgram.findFirst({
    where: { userId, isArchived: false, days: { some: {} } },
    orderBy: { updatedAt: "desc" },
    select: {
      name: true,
      days: { orderBy: { position: "asc" }, select: { id: true, name: true } },
    },
  });
  if (!program || program.days.length === 0) return null;

  const workouts = await prisma.workout.findMany({
    where: {
      userId,
      status: WorkoutStatus.COMPLETED,
      programDayId: { in: program.days.map((day) => day.id) },
    },
    orderBy: { startedAt: "desc" },
    select: { programDayId: true, startedAt: true },
  });

  const lastByDay = new Map<string, Date>();
  for (const workout of workouts) {
    if (workout.programDayId && !lastByDay.has(workout.programDayId)) {
      lastByDay.set(workout.programDayId, workout.startedAt);
    }
  }

  // Un jour jamais réalisé passe en premier ; sinon le plus ancien.
  const candidates = program.days.map((day) => ({
    ...day,
    lastPerformedAt: lastByDay.get(day.id) ?? null,
  }));
  candidates.sort((a, b) => {
    if (a.lastPerformedAt === null) return -1;
    if (b.lastPerformedAt === null) return 1;
    return a.lastPerformedAt.getTime() - b.lastPerformedAt.getTime();
  });

  const next = candidates[0];
  return next ? { ...next, programName: program.name } : null;
}

// ---------------------------------------------------------------------------
// Statistiques générales
// ---------------------------------------------------------------------------

export interface GeneralStats {
  totalWorkouts: number;
  totalVolumeKg: number;
  totalSets: number;
  totalTrainingSeconds: number;
  averageDurationSeconds: number | null;
  /** Séances par semaine, sur les 12 dernières semaines. */
  weeklyWorkouts: { label: string; timestamp: number; count: number; volumeKg: number }[];
  /** Séances par mois, sur les 12 derniers mois. */
  monthlyWorkouts: { label: string; timestamp: number; count: number; volumeKg: number }[];
  volumeByMuscleGroup: { muscleGroup: MuscleGroup; volumeKg: number; sets: number }[];
  topExercises: { id: string; name: string; sessionCount: number }[];
  /** Séances par semaine en moyenne sur la période couverte. */
  workoutsPerWeek: number | null;
}

export async function getGeneralStats(userId: string): Promise<GeneralStats> {
  const now = new Date();
  const weeksFrom = startOfWeek(subWeeks(now, 11), WEEK_OPTIONS);
  const monthsFrom = startOfMonth(subMonths(now, 11));

  const [totals, workouts, topExercises, volumeRows] = await Promise.all([
    prisma.workout.aggregate({
      where: { userId, status: WorkoutStatus.COMPLETED },
      _count: { id: true },
      _sum: { totalVolumeKg: true, totalSets: true, durationSeconds: true },
      _avg: { durationSeconds: true },
    }),
    prisma.workout.findMany({
      where: {
        userId,
        status: WorkoutStatus.COMPLETED,
        startedAt: { gte: monthsFrom },
      },
      select: { startedAt: true, totalVolumeKg: true },
    }),
    getTopExercises(userId, 8),
    prisma.workoutSet.findMany({
      where: {
        isCompleted: true,
        isWarmup: false,
        workoutExercise: { workout: { userId, status: WorkoutStatus.COMPLETED } },
      },
      select: {
        ...SET_METRICS_SELECT,
        workoutExercise: { select: { exercise: { select: { muscleGroup: true } } } },
      },
    }),
  ]);

  // Volume par groupe musculaire : seul le muscle principal est compté, pour
  // qu'une même série ne soit pas comptabilisée plusieurs fois.
  const byMuscle = new Map<MuscleGroup, { volumeKg: number; sets: number }>();
  for (const row of volumeRows) {
    const group = row.workoutExercise.exercise.muscleGroup;
    const bucket = byMuscle.get(group) ?? { volumeKg: 0, sets: 0 };
    bucket.volumeKg += setVolumeKg(toSetMetrics(row)) ?? 0;
    bucket.sets += 1;
    byMuscle.set(group, bucket);
  }

  const weeklyBuckets = eachWeekOfInterval({ start: weeksFrom, end: now }, WEEK_OPTIONS).map(
    (start) => ({
      label: `S${formatWeekNumber(start)}`,
      timestamp: start.getTime(),
      count: 0,
      volumeKg: 0,
    }),
  );

  const monthlyBuckets = eachMonthOfInterval({ start: monthsFrom, end: now }).map((start) => ({
    label: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(start),
    timestamp: start.getTime(),
    count: 0,
    volumeKg: 0,
  }));

  for (const workout of workouts) {
    const volume = decimalToNumber(workout.totalVolumeKg) ?? 0;

    const weekKey = startOfWeek(workout.startedAt, WEEK_OPTIONS).getTime();
    const weekBucket = weeklyBuckets.find((bucket) => bucket.timestamp === weekKey);
    if (weekBucket) {
      weekBucket.count += 1;
      weekBucket.volumeKg += volume;
    }

    const monthKey = startOfMonth(workout.startedAt).getTime();
    const monthBucket = monthlyBuckets.find((bucket) => bucket.timestamp === monthKey);
    if (monthBucket) {
      monthBucket.count += 1;
      monthBucket.volumeKg += volume;
    }
  }

  const weeksWithData = weeklyBuckets.filter((bucket) => bucket.count > 0).length;
  const workoutsPerWeek =
    weeksWithData > 0
      ? Math.round(
          (weeklyBuckets.reduce((total, bucket) => total + bucket.count, 0) /
            weeklyBuckets.length) *
            10,
        ) / 10
      : null;

  return {
    totalWorkouts: totals._count.id,
    totalVolumeKg: decimalToNumber(totals._sum.totalVolumeKg) ?? 0,
    totalSets: totals._sum.totalSets ?? 0,
    totalTrainingSeconds: totals._sum.durationSeconds ?? 0,
    averageDurationSeconds: totals._avg.durationSeconds ?? null,
    weeklyWorkouts: weeklyBuckets,
    monthlyWorkouts: monthlyBuckets,
    volumeByMuscleGroup: [...byMuscle.entries()]
      .map(([muscleGroup, value]) => ({ muscleGroup, ...value }))
      .sort((a, b) => b.volumeKg - a.volumeKg),
    topExercises,
    workoutsPerWeek,
  };
}

function formatWeekNumber(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date);
}

// ---------------------------------------------------------------------------
// Calendrier
// ---------------------------------------------------------------------------

export interface CalendarDay {
  date: string;
  workouts: { id: string; name: string; totalSets: number; totalVolumeKg: number }[];
}

/** Séances d'un mois donné, indexées par jour (format `yyyy-MM-dd`). */
export async function getCalendarMonth(
  userId: string,
  month: Date,
): Promise<Map<string, CalendarDay["workouts"]>> {
  const workouts = await prisma.workout.findMany({
    where: {
      userId,
      status: { not: WorkoutStatus.ABANDONED },
      startedAt: { gte: startOfMonth(month), lte: endOfMonth(month) },
    },
    orderBy: { startedAt: "asc" },
    select: { id: true, name: true, startedAt: true, totalSets: true, totalVolumeKg: true },
  });

  const byDay = new Map<string, CalendarDay["workouts"]>();
  for (const workout of workouts) {
    const key = toDateKey(workout.startedAt);
    const bucket = byDay.get(key) ?? [];
    bucket.push({
      id: workout.id,
      name: workout.name,
      totalSets: workout.totalSets,
      totalVolumeKg: decimalToNumber(workout.totalVolumeKg) ?? 0,
    });
    byDay.set(key, bucket);
  }
  return byDay;
}

/** Clé de jour locale (`yyyy-MM-dd`), sans décalage de fuseau. */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
