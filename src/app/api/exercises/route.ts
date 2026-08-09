import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError, parseJsonBody, parseSearchParams } from "@/server/http";
import { createExercise, listExercises } from "@/server/services/exercise.service";
import { createExerciseSchema, exerciseFiltersSchema } from "@/server/validation/exercise";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const filters = parseSearchParams(request, exerciseFiltersSchema);
    const exercises = await listExercises(user.id, filters);
    return NextResponse.json({ exercises });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = await parseJsonBody(request, createExerciseSchema);
    const exercise = await createExercise(user.id, input);
    return NextResponse.json({ exercise }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
