import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError, parseJsonBody } from "@/server/http";
import { createVariant, getExercise } from "@/server/services/exercise.service";
import { createVariantSchema } from "@/server/validation/exercise";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const exercise = await getExercise(user.id, id);
    return NextResponse.json({ variants: exercise.variants });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const input = await parseJsonBody(request, createVariantSchema);
    const variant = await createVariant(user.id, id, input);
    return NextResponse.json({ variant }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
