import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError } from "@/server/http";
import { getExerciseStats } from "@/server/services/exercise-history.service";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const raw = new URL(request.url).searchParams.get("variant");
    const variantId = raw === null ? undefined : raw === "none" ? null : raw;

    return NextResponse.json({ stats: await getExerciseStats(user.id, id, variantId) });
  } catch (error) {
    return handleRouteError(error);
  }
}
