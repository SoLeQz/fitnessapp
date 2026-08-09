"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/guard";
import {
  abandonWorkout,
  addSet,
  addWorkoutExercise,
  copyLastSessionSets,
  deleteSet,
  finishWorkout,
  removeWorkoutExercise,
  repeatLastSet,
  startWorkout,
  updateSet,
  updateWorkout,
  updateWorkoutExercise,
} from "@/server/services/workout.service";
import type { WorkoutView } from "@/server/services/workout-view";
import {
  addWorkoutExerciseSchema,
  setInputSchema,
  updateSetSchema,
  updateWorkoutSchema,
  startWorkoutSchema,
} from "@/server/validation/workout";

/**
 * Les actions de séance renvoient la séance complète : le client remplace son
 * état par la réponse du serveur, ce qui garantit qu'aucune saisie ne diverge
 * de ce qui est réellement enregistré.
 */

export async function startWorkoutAction(input: {
  name?: string;
  programDayId?: string;
}): Promise<void> {
  const user = await requireUser();
  await startWorkout(user.id, startWorkoutSchema.parse(input));
  revalidatePath("/", "layout");
  redirect("/workout/active");
}

export async function addExerciseAction(
  workoutId: string,
  input: { exerciseId: string; variantId?: string | null },
): Promise<WorkoutView> {
  const user = await requireUser();
  return addWorkoutExercise(user.id, workoutId, addWorkoutExerciseSchema.parse(input));
}

export async function removeExerciseAction(workoutExerciseId: string): Promise<WorkoutView> {
  const user = await requireUser();
  return removeWorkoutExercise(user.id, workoutExerciseId);
}

export async function selectVariantAction(
  workoutExerciseId: string,
  variantId: string | null,
): Promise<WorkoutView> {
  const user = await requireUser();
  return updateWorkoutExercise(user.id, workoutExerciseId, { variantId });
}

export async function addSetAction(
  workoutExerciseId: string,
  input: unknown,
): Promise<WorkoutView> {
  const user = await requireUser();
  return addSet(user.id, workoutExerciseId, setInputSchema.parse(input));
}

export async function updateSetAction(setId: string, input: unknown): Promise<WorkoutView> {
  const user = await requireUser();
  return updateSet(user.id, setId, updateSetSchema.parse(input));
}

export async function deleteSetAction(setId: string): Promise<WorkoutView> {
  const user = await requireUser();
  return deleteSet(user.id, setId);
}

export async function repeatLastSetAction(workoutExerciseId: string): Promise<WorkoutView> {
  const user = await requireUser();
  return repeatLastSet(user.id, workoutExerciseId);
}

export async function copyLastSessionAction(workoutExerciseId: string): Promise<WorkoutView> {
  const user = await requireUser();
  return copyLastSessionSets(user.id, workoutExerciseId);
}

export async function renameWorkoutAction(
  workoutId: string,
  input: { name?: string; notes?: string | null },
): Promise<WorkoutView> {
  const user = await requireUser();
  return updateWorkout(user.id, workoutId, updateWorkoutSchema.parse(input));
}

export async function finishWorkoutAction(workoutId: string, notes?: string): Promise<void> {
  const user = await requireUser();
  await finishWorkout(user.id, workoutId, {
    notes: notes?.trim() || null,
    discardIncompleteSets: true,
  });
  revalidatePath("/", "layout");
  redirect(`/workouts/${workoutId}`);
}

export async function abandonWorkoutAction(workoutId: string): Promise<void> {
  const user = await requireUser();
  await abandonWorkout(user.id, workoutId);
  revalidatePath("/", "layout");
  redirect("/");
}
