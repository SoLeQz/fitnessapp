import type { Prisma } from "@/generated/prisma/client";
import { PersonalRecordType, WorkoutStatus, type LoadUnit } from "@/generated/prisma/enums";
import {
  estimateOneRepMax,
  isWorkingSet,
  setVolumeKg,
  totalVolumeKg,
  type SetMetrics,
} from "@/lib/set-metrics";
import { decimalToNumber, type Db } from "@/server/prisma-utils";

/**
 * Colonnes minimales à sélectionner pour qu'une série soit convertible en
 * `SetMetrics`. Partagé par tous les services qui lisent des séries.
 */
export const SET_METRICS_SELECT = {
  weight: true,
  weightUnit: true,
  weightKg: true,
  reps: true,
  durationSeconds: true,
  distanceMeters: true,
  isWarmup: true,
  isCompleted: true,
} as const satisfies Prisma.WorkoutSetSelect;

/** Série telle que lue en base avec `SET_METRICS_SELECT`. */
export type StoredSet = Prisma.WorkoutSetGetPayload<{ select: typeof SET_METRICS_SELECT }>;

/** Passe d'une ligne Prisma au type du domaine pur (Decimal -> number). */
export function toSetMetrics(set: StoredSet): SetMetrics {
  return {
    weight: decimalToNumber(set.weight),
    weightUnit: set.weightUnit,
    weightKg: decimalToNumber(set.weightKg),
    reps: set.reps,
    durationSeconds: set.durationSeconds,
    distanceMeters: decimalToNumber(set.distanceMeters),
    isWarmup: set.isWarmup,
    isCompleted: set.isCompleted,
  };
}

/**
 * Recalcule les agrégats matérialisés d'une séance (volume, nombre de séries,
 * durée). Appelée à chaque modification de série, dans la même transaction que
 * la modification elle-même : les totaux ne peuvent donc jamais diverger.
 */
export async function recalculateWorkoutTotals(db: Db, workoutId: string): Promise<void> {
  const workout = await db.workout.findUnique({
    where: { id: workoutId },
    select: {
      startedAt: true,
      finishedAt: true,
      exercises: { select: { sets: { select: SET_METRICS_SELECT } } },
    },
  });

  if (!workout) return;

  const sets = workout.exercises.flatMap((exercise) => exercise.sets.map(toSetMetrics));
  const workingSets = sets.filter(isWorkingSet);

  const durationSeconds = workout.finishedAt
    ? Math.max(
        0,
        Math.round((workout.finishedAt.getTime() - workout.startedAt.getTime()) / 1000),
      )
    : null;

  await db.workout.update({
    where: { id: workoutId },
    data: {
      totalVolumeKg: totalVolumeKg(sets),
      totalSets: workingSets.length,
      durationSeconds,
    },
  });
}

/** Couple (exercice, variante) : la granularité de tous les records. */
export interface ExerciseScope {
  exerciseId: string;
  variantId: string | null;
}

/**
 * Recalcule intégralement les records d'un couple (exercice, variante) à partir
 * de l'historique. Un recalcul complet plutôt qu'incrémental garantit que
 * supprimer ou corriger une série fait bien redescendre un record.
 */
export async function refreshPersonalRecords(
  db: Db,
  userId: string,
  scopes: readonly ExerciseScope[],
): Promise<void> {
  for (const scope of scopes) {
    await refreshScopeRecords(db, userId, scope);
  }
}

async function refreshScopeRecords(
  db: Db,
  userId: string,
  scope: ExerciseScope,
): Promise<void> {
  const rows = await db.workoutSet.findMany({
    where: {
      isCompleted: true,
      isWarmup: false,
      workoutExercise: {
        exerciseId: scope.exerciseId,
        variantId: scope.variantId,
        workout: { userId, status: { not: WorkoutStatus.ABANDONED } },
      },
    },
    select: {
      ...SET_METRICS_SELECT,
      workoutExercise: {
        select: { workoutId: true, workout: { select: { startedAt: true } } },
      },
    },
  });

  await db.personalRecord.deleteMany({
    where: { userId, exerciseId: scope.exerciseId, variantId: scope.variantId },
  });

  if (rows.length === 0) return;

  const entries = rows.map((row) => ({
    metrics: toSetMetrics(row),
    workoutId: row.workoutExercise.workoutId,
    achievedAt: row.workoutExercise.workout.startedAt,
  }));

  interface Candidate {
    value: number;
    weight: number | null;
    weightUnit: LoadUnit | null;
    reps: number | null;
    workoutId: string | null;
    achievedAt: Date;
  }

  const records = new Map<PersonalRecordType, Candidate>();

  /** Ne conserve que le meilleur ; à égalité, la performance la plus ancienne
   * reste le record (c'est elle qui l'a établi). */
  const consider = (type: PersonalRecordType, candidate: Candidate | null): void => {
    if (candidate === null || !Number.isFinite(candidate.value)) return;
    const current = records.get(type);
    if (!current || candidate.value > current.value) records.set(type, candidate);
  };

  const volumeByWorkout = new Map<string, { volume: number; achievedAt: Date }>();

  for (const entry of entries) {
    const { metrics, workoutId, achievedAt } = entry;
    const base = {
      weight: metrics.weight,
      weightUnit: metrics.weightUnit,
      reps: metrics.reps,
      workoutId,
      achievedAt,
    };

    const weightValue = metrics.weightKg ?? metrics.weight;
    if (weightValue !== null && weightValue > 0) {
      consider(PersonalRecordType.MAX_WEIGHT, { ...base, value: weightValue });
    }

    if (metrics.reps !== null && metrics.reps > 0) {
      consider(PersonalRecordType.MAX_REPS, { ...base, value: metrics.reps });
    }

    const volume = setVolumeKg(metrics);
    if (volume !== null && volume > 0) {
      consider(PersonalRecordType.BEST_SET_VOLUME, { ...base, value: volume });
    }

    const oneRepMax = estimateOneRepMax(metrics);
    if (oneRepMax !== null) {
      consider(PersonalRecordType.BEST_EST_1RM, { ...base, value: oneRepMax });
    }

    const session = volumeByWorkout.get(workoutId) ?? { volume: 0, achievedAt };
    session.volume += volume ?? 0;
    volumeByWorkout.set(workoutId, session);
  }

  for (const [workoutId, session] of volumeByWorkout) {
    if (session.volume <= 0) continue;
    consider(PersonalRecordType.BEST_SESSION_VOLUME, {
      value: session.volume,
      weight: null,
      weightUnit: null,
      reps: null,
      workoutId,
      achievedAt: session.achievedAt,
    });
  }

  if (records.size === 0) return;

  await db.personalRecord.createMany({
    data: [...records].map(([type, candidate]) => ({
      userId,
      exerciseId: scope.exerciseId,
      variantId: scope.variantId,
      type,
      value: candidate.value,
      weight: candidate.weight,
      weightUnit: candidate.weightUnit,
      reps: candidate.reps,
      workoutId: candidate.workoutId,
      achievedAt: candidate.achievedAt,
    })),
  });
}
