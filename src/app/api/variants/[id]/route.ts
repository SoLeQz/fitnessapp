import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError, parseJsonBody } from "@/server/http";
import { deleteVariant, updateVariant } from "@/server/services/exercise.service";
import { updateVariantSchema } from "@/server/validation/exercise";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const input = await parseJsonBody(request, updateVariantSchema);
    return NextResponse.json({ variant: await updateVariant(user.id, id, input) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json(await deleteVariant(user.id, id));
  } catch (error) {
    return handleRouteError(error);
  }
}
