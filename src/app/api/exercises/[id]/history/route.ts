import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError } from "@/server/http";
import {
  getExerciseHistory,
  toProgressPoints,
} from "@/server/services/exercise-history.service";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // `variant=none` cible explicitement les séries sans machine ; absent, on
    // renvoie toutes les machines confondues.
    const raw = new URL(request.url).searchParams.get("variant");
    const variantId = raw === null ? undefined : raw === "none" ? null : raw;

    const sessions = await getExerciseHistory(user.id, id, variantId);
    return NextResponse.json({ sessions, points: toProgressPoints(sessions) });
  } catch (error) {
    return handleRouteError(error);
  }
}
