import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError, parseJsonBody } from "@/server/http";
import { createProgram, listPrograms } from "@/server/services/program.service";
import { createProgramSchema } from "@/server/validation/program";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ programs: await listPrograms(user.id) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = await parseJsonBody(request, createProgramSchema);
    return NextResponse.json({ program: await createProgram(user.id, input) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
