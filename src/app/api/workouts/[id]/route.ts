import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError, parseJsonBody } from "@/server/http";
import { deleteWorkout, getWorkout, updateWorkout } from "@/server/services/workout.service";
import { updateWorkoutSchema } from "@/server/validation/workout";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json({ workout: await getWorkout(user.id, id) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const input = await parseJsonBody(request, updateWorkoutSchema);
    return NextResponse.json({ workout: await updateWorkout(user.id, id, input) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await deleteWorkout(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
