import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError } from "@/server/http";
import { abandonWorkout } from "@/server/services/workout.service";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await abandonWorkout(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
