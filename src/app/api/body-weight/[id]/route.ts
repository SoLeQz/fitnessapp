import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError } from "@/server/http";
import { deleteBodyWeightEntry } from "@/server/services/body-weight.service";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await deleteBodyWeightEntry(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
