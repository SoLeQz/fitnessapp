import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError, parseJsonBody } from "@/server/http";
import { addProgramExercise } from "@/server/services/program.service";
import { addProgramExerciseSchema } from "@/server/validation/program";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const input = await parseJsonBody(request, addProgramExerciseSchema);
    return NextResponse.json(
      { program: await addProgramExercise(user.id, id, input) },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
