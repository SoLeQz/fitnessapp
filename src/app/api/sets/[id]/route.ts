import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError, parseJsonBody } from "@/server/http";
import { deleteSet, updateSet } from "@/server/services/workout.service";
import { updateSetSchema } from "@/server/validation/workout";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const input = await parseJsonBody(request, updateSetSchema);
    return NextResponse.json({ workout: await updateSet(user.id, id, input) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json({ workout: await deleteSet(user.id, id) });
  } catch (error) {
    return handleRouteError(error);
  }
}
