import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError, parseJsonBody } from "@/server/http";
import {
  deleteExercise,
  getExercise,
  updateExercise,
} from "@/server/services/exercise.service";
import { updateExerciseSchema } from "@/server/validation/exercise";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json({ exercise: await getExercise(user.id, id) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const input = await parseJsonBody(request, updateExerciseSchema);
    return NextResponse.json({ exercise: await updateExercise(user.id, id, input) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json(await deleteExercise(user.id, id));
  } catch (error) {
    return handleRouteError(error);
  }
}
