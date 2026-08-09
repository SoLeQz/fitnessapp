"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/guard";
import { destroyCurrentSession } from "@/server/auth/session";
import type { FormState } from "@/lib/form-state";
import { successState, toErrorState } from "@/server/form-state";
import { changePassword, updateProfile } from "@/server/services/auth.service";
import { changePasswordSchema, updateProfileSchema } from "@/server/validation/auth";

export async function updateProfileAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await requireUser();
    const input = updateProfileSchema.parse({
      displayName: formData.get("displayName"),
      preferredUnit: formData.get("preferredUnit"),
      defaultRestSeconds: Number(formData.get("defaultRestSeconds")),
    });
    await updateProfile(user.id, input);
  } catch (error) {
    return toErrorState(error);
  }

  revalidatePath("/profile");
  return successState("Profil mis à jour.");
}

export async function changePasswordAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await requireUser();
    const input = changePasswordSchema.parse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
    });
    await changePassword(user.id, input);
  } catch (error) {
    return toErrorState(error);
  }

  // Toutes les sessions viennent d'être révoquées, y compris celle-ci.
  redirect("/login?reset=1");
}

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/login");
}
