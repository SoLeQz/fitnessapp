import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError, parseJsonBody } from "@/server/http";
import { addProgramDay } from "@/server/services/program.service";
import { createProgramDaySchema } from "@/server/validation/program";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const input = await parseJsonBody(request, createProgramDaySchema);
    return NextResponse.json({ program: await addProgramDay(user.id, id, input) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
