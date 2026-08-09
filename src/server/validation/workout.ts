import { z } from "zod";

const cuid = z.string().min(1).max(40);

export const startWorkoutSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(80).optional(),
  programDayId: cuid.optional(),
  /** Exercices ajoutés d'emblée, hors programme. */
  exerciseIds: z.array(cuid).max(30).optional(),
});

export const updateWorkoutSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  notes: z.string().trim().max(2000).nullish(),
});

export const addWorkoutExerciseSchema = z.object({
  exerciseId: cuid,
  variantId: cuid.nullish(),
});

export const updateWorkoutExerciseSchema = z.object({
  variantId: cuid.nullish(),
  notes: z.string().trim().max(1000).nullish(),
  position: z.number().int().min(0).max(100).optional(),
});

/**
 * Une série. Tous les champs de mesure sont facultatifs : le `TrackingMode` de
 * l'exercice détermine ceux qui ont un sens, et le service refuse une série
 * entièrement vide.
 */
export const setInputSchema = z.object({
  weight: z.coerce.number().min(0).max(2000).nullish(),
  reps: z.coerce.number().int().min(0).max(1000).nullish(),
  durationSeconds: z.coerce.number().int().min(0).max(86_400).nullish(),
  distanceMeters: z.coerce.number().min(0).max(1_000_000).nullish(),
  restSeconds: z.coerce.number().int().min(0).max(3600).nullish(),
  rpe: z.coerce.number().min(1).max(10).nullish(),
  isWarmup: z.boolean().optional(),
  isCompleted: z.boolean().optional(),
  notes: z.string().trim().max(500).nullish(),
});

export const updateSetSchema = setInputSchema.partial();

export const finishWorkoutSchema = z.object({
  notes: z.string().trim().max(2000).nullish(),
  /** Supprime les séries restées non validées au lieu de les conserver. */
  discardIncompleteSets: z.boolean().default(true),
});

export const workoutListFiltersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type StartWorkoutInput = z.infer<typeof startWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
export type AddWorkoutExerciseInput = z.infer<typeof addWorkoutExerciseSchema>;
export type UpdateWorkoutExerciseInput = z.infer<typeof updateWorkoutExerciseSchema>;
export type SetInput = z.infer<typeof setInputSchema>;
export type UpdateSetInput = z.infer<typeof updateSetSchema>;
export type FinishWorkoutInput = z.infer<typeof finishWorkoutSchema>;
export type WorkoutListFilters = z.infer<typeof workoutListFiltersSchema>;
