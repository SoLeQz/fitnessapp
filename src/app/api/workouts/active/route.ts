import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError } from "@/server/http";
import { getActiveWorkout } from "@/server/services/workout.service";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ workout: await getActiveWorkout(user.id) });
  } catch (error) {
    return handleRouteError(error);
  }
}
