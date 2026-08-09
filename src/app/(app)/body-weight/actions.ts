"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/lib/form-state";
import { requireUser } from "@/server/auth/guard";
import { successState, toErrorState } from "@/server/form-state";
import {
  deleteBodyWeightEntry,
  recordBodyWeight,
} from "@/server/services/body-weight.service";
import { recordBodyWeightSchema } from "@/server/validation/body-weight";

export async function recordBodyWeightAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await requireUser();
    const measuredOn = formData.get("measuredOn");
    const input = recordBodyWeightSchema.parse({
      weight: formData.get("weight"),
      unit: formData.get("unit"),
      measuredOn: typeof measuredOn === "string" && measuredOn ? measuredOn : new Date(),
    });
    await recordBodyWeight(user.id, input);
  } catch (error) {
    return toErrorState(error);
  }

  revalidatePath("/body-weight");
  return successState("Pesée enregistrée.");
}

export async function deleteBodyWeightAction(entryId: string): Promise<void> {
  const user = await requireUser();
  await deleteBodyWeightEntry(user.id, entryId);
  revalidatePath("/body-weight");
}
