"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/lib/form-state";
import { requireUser } from "@/server/auth/guard";
import { toErrorState } from "@/server/form-state";
import {
  addProgramDay,
  addProgramExercise,
  createProgram,
  deleteProgram,
  deleteProgramDay,
  removeProgramExercise,
  updateProgramExercise,
  type ProgramView,
} from "@/server/services/program.service";
import {
  addProgramExerciseSchema,
  createProgramDaySchema,
  createProgramSchema,
  updateProgramExerciseSchema,
} from "@/server/validation/program";

export async function createProgramAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  let programId: string;
  try {
    const user = await requireUser();
    const description = formData.get("description");
    const input = createProgramSchema.parse({
      name: formData.get("name"),
      description: typeof description === "string" && description.trim() ? description : undefined,
    });
    const program = await createProgram(user.id, input);
    programId = program.id;
  } catch (error) {
    return toErrorState(error);
  }

  revalidatePath("/programs");
  redirect(`/programs/${programId}`);
}

export async function addDayAction(
  programId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await requireUser();
    const input = createProgramDaySchema.parse({ name: formData.get("name") });
    await addProgramDay(user.id, programId, input);
  } catch (error) {
    return toErrorState(error);
  }

  revalidatePath(`/programs/${programId}`);
  return { status: "success", message: "Jour ajouté." };
}

export async function addExerciseToDayAction(
  dayId: string,
  input: { exerciseId: string; targetSets?: number },
): Promise<ProgramView> {
  const user = await requireUser();
  return addProgramExercise(user.id, dayId, addProgramExerciseSchema.parse(input));
}

export async function updateProgramExerciseAction(
  programExerciseId: string,
  input: unknown,
): Promise<ProgramView> {
  const user = await requireUser();
  return updateProgramExercise(
    user.id,
    programExerciseId,
    updateProgramExerciseSchema.parse(input),
  );
}

export async function removeProgramExerciseAction(
  programExerciseId: string,
): Promise<ProgramView> {
  const user = await requireUser();
  return removeProgramExercise(user.id, programExerciseId);
}

export async function deleteDayAction(dayId: string): Promise<ProgramView> {
  const user = await requireUser();
  return deleteProgramDay(user.id, dayId);
}

export async function deleteProgramAction(programId: string): Promise<void> {
  const user = await requireUser();
  await deleteProgram(user.id, programId);
  revalidatePath("/programs");
  redirect("/programs");
}
