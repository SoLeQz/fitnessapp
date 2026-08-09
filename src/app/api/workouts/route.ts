import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError, parseJsonBody, parseSearchParams } from "@/server/http";
import { listWorkouts, startWorkout } from "@/server/services/workout.service";
import { startWorkoutSchema, workoutListFiltersSchema } from "@/server/validation/workout";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const filters = parseSearchParams(request, workoutListFiltersSchema);
    return NextResponse.json({ workouts: await listWorkouts(user.id, filters) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = await parseJsonBody(request, startWorkoutSchema);
    return NextResponse.json({ workout: await startWorkout(user.id, input) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
