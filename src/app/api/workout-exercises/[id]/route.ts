import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError, parseJsonBody } from "@/server/http";
import {
  removeWorkoutExercise,
  updateWorkoutExercise,
} from "@/server/services/workout.service";
import { updateWorkoutExerciseSchema } from "@/server/validation/workout";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const input = await parseJsonBody(request, updateWorkoutExerciseSchema);
    return NextResponse.json({ workout: await updateWorkoutExercise(user.id, id, input) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json({ workout: await removeWorkoutExercise(user.id, id) });
  } catch (error) {
    return handleRouteError(error);
  }
}
