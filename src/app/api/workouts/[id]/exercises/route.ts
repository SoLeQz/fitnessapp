import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError, parseJsonBody } from "@/server/http";
import { addWorkoutExercise } from "@/server/services/workout.service";
import { addWorkoutExerciseSchema } from "@/server/validation/workout";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const input = await parseJsonBody(request, addWorkoutExerciseSchema);
    return NextResponse.json(
      { workout: await addWorkoutExercise(user.id, id, input) },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
