import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError, parseOptionalJsonBody } from "@/server/http";
import { finishWorkout } from "@/server/services/workout.service";
import { finishWorkoutSchema } from "@/server/validation/workout";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    // Terminer une séance sans note est le cas courant : le corps est facultatif.
    const input = await parseOptionalJsonBody(request, finishWorkoutSchema);
    return NextResponse.json({ workout: await finishWorkout(user.id, id, input) });
  } catch (error) {
    return handleRouteError(error);
  }
}
