import type { Prisma } from "@/generated/prisma/client";
import type {
  ExerciseCategory,
  LoadUnit,
  MuscleGroup,
  TrackingMode,
  WorkoutStatus,
} from "@/generated/prisma/enums";
import { defaultIncrementFor } from "@/lib/increment";
import { formatWeight } from "@/lib/load-unit";
import { decimalToNumber } from "@/server/prisma-utils";

/**
 * Formes envoyées aux composants. Elles ne contiennent que des types
 * sérialisables (les `Decimal` sont convertis en nombres) pour pouvoir franchir
 * la frontière serveur/client des Server Components.
 */

export interface WorkoutSetView {
  id: string;
  setNumber: number;
  weight: number | null;
  weightUnit: LoadUnit;
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  restSeconds: number | null;
  rpe: number | null;
  isWarmup: boolean;
  isCompleted: boolean;
  notes: string | null;
}

export interface LastPerformanceView {
  workoutId: string;
  performedAt: Date;
  sets: { weight: number | null; weightUnit: LoadUnit; reps: number | null }[];
  /** Résumé compact : « 65 kg × 10 × 3 ». */
  summary: string;
}

export interface WorkoutExerciseView {
  id: string;
  position: number;
  notes: string | null;
  exercise: {
    id: string;
    name: string;
    muscleGroup: MuscleGroup;
    category: ExerciseCategory;
    trackingMode: TrackingMode;
    defaultUnit: LoadUnit;
  };
  variant: { id: string; label: string; unit: LoadUnit } | null;
  /** Machines configurées pour cet exercice, pour pouvoir en changer en séance. */
  availableVariants: { id: string; label: string; unit: LoadUnit }[];
  /** Unité effective : celle de la machine si une variante est choisie. */
  resolvedUnit: LoadUnit;
  weightIncrement: number;
  sets: WorkoutSetView[];
  lastPerformance: LastPerformanceView | null;
}

export interface WorkoutView {
  id: string;
  name: string;
  status: WorkoutStatus;
  startedAt: Date;
  finishedAt: Date | null;
  notes: string | null;
  totalVolumeKg: number;
  totalSets: number;
  durationSeconds: number | null;
  programDay: { id: string; name: string; programName: string } | null;
  exercises: WorkoutExerciseView[];
}

export const WORKOUT_SET_SELECT = {
  id: true,
  setNumber: true,
  weight: true,
  weightUnit: true,
  weightKg: true,
  reps: true,
  durationSeconds: true,
  distanceMeters: true,
  restSeconds: true,
  rpe: true,
  isWarmup: true,
  isCompleted: true,
  notes: true,
} as const satisfies Prisma.WorkoutSetSelect;

type StoredWorkoutSet = Prisma.WorkoutSetGetPayload<{ select: typeof WORKOUT_SET_SELECT }>;

export function toSetView(set: StoredWorkoutSet): WorkoutSetView {
  return {
    id: set.id,
    setNumber: set.setNumber,
    weight: decimalToNumber(set.weight),
    weightUnit: set.weightUnit,
    weightKg: decimalToNumber(set.weightKg),
    reps: set.reps,
    durationSeconds: set.durationSeconds,
    distanceMeters: decimalToNumber(set.distanceMeters),
    restSeconds: set.restSeconds,
    rpe: decimalToNumber(set.rpe),
    isWarmup: set.isWarmup,
    isCompleted: set.isCompleted,
    notes: set.notes,
  };
}

/** Unité effective d'un exercice de séance : la machine prime sur l'exercice. */
export function resolveUnit(
  exerciseDefaultUnit: LoadUnit,
  variantUnit: LoadUnit | null | undefined,
): LoadUnit {
  return variantUnit ?? exerciseDefaultUnit;
}

export function resolveIncrement(
  unit: LoadUnit,
  variantIncrement: number | null | undefined,
): number {
  return variantIncrement ?? defaultIncrementFor(unit);
}

/**
 * Résumé compact d'une performance : les séries identiques sont regroupées,
 * « 65 kg × 10 × 3 » plutôt que « 65×10, 65×10, 65×10 ».
 */
export function summarizeSets(
  sets: { weight: number | null; weightUnit: LoadUnit; reps: number | null }[],
): string {
  if (sets.length === 0) return "—";

  const groups: { label: string; count: number }[] = [];
  for (const set of sets) {
    const weightLabel = formatWeight(set.weight, set.weightUnit);
    const repsLabel = set.reps !== null ? `${set.reps} reps` : null;
    const label = [weightLabel, repsLabel].filter(Boolean).join(" × ") || "série";

    const last = groups.at(-1);
    if (last && last.label === label) last.count += 1;
    else groups.push({ label, count: 1 });
  }

  return groups
    .map((group) => (group.count > 1 ? `${group.label} × ${group.count}` : group.label))
    .join(" · ");
}
