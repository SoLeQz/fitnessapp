import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError, parseJsonBody } from "@/server/http";
import { deleteProgramDay, updateProgramDay } from "@/server/services/program.service";
import { updateProgramDaySchema } from "@/server/validation/program";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const input = await parseJsonBody(request, updateProgramDaySchema);
    return NextResponse.json({ program: await updateProgramDay(user.id, id, input) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json({ program: await deleteProgramDay(user.id, id) });
  } catch (error) {
    return handleRouteError(error);
  }
}
