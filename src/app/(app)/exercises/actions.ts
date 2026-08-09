"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/lib/form-state";
import { requireUser } from "@/server/auth/guard";
import { successState, toErrorState } from "@/server/form-state";
import {
  createExercise,
  createVariant,
  deleteExercise,
  deleteVariant,
  setFavorite,
  updateVariant,
} from "@/server/services/exercise.service";
import { createExerciseSchema, createVariantSchema } from "@/server/validation/exercise";

function optionalText(value: FormDataEntryValue | null): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
}

export async function createExerciseAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  let exerciseId: string;

  try {
    const user = await requireUser();
    const input = createExerciseSchema.parse({
      name: formData.get("name"),
      muscleGroup: formData.get("muscleGroup"),
      category: formData.get("category"),
      trackingMode: formData.get("trackingMode"),
      defaultUnit: formData.get("defaultUnit"),
      description: optionalText(formData.get("description")),
      secondaryMuscles: [],
    });
    const exercise = await createExercise(user.id, input);
    exerciseId = exercise.id;
  } catch (error) {
    return toErrorState(error);
  }

  revalidatePath("/exercises");
  redirect(`/exercises/${exerciseId}`);
}

export async function toggleFavoriteAction(exerciseId: string, favorite: boolean): Promise<void> {
  const user = await requireUser();
  await setFavorite(user.id, exerciseId, favorite);
  revalidatePath("/exercises");
  revalidatePath(`/exercises/${exerciseId}`);
}

export async function deleteExerciseAction(exerciseId: string): Promise<void> {
  const user = await requireUser();
  await deleteExercise(user.id, exerciseId);
  revalidatePath("/exercises");
  redirect("/exercises");
}

export async function createVariantAction(
  exerciseId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await requireUser();
    const input = createVariantSchema.parse({
      label: formData.get("label"),
      unit: formData.get("unit"),
      weightIncrement: formData.get("weightIncrement"),
      notes: optionalText(formData.get("notes")),
      isDefault: formData.get("isDefault") === "on",
    });
    await createVariant(user.id, exerciseId, input);
  } catch (error) {
    return toErrorState(error);
  }

  revalidatePath(`/exercises/${exerciseId}`);
  return successState("Machine ajoutée.");
}

export async function setDefaultVariantAction(
  exerciseId: string,
  variantId: string,
): Promise<void> {
  const user = await requireUser();
  await updateVariant(user.id, variantId, { isDefault: true });
  revalidatePath(`/exercises/${exerciseId}`);
}

export async function deleteVariantAction(exerciseId: string, variantId: string): Promise<void> {
  const user = await requireUser();
  await deleteVariant(user.id, variantId);
  revalidatePath(`/exercises/${exerciseId}`);
}
