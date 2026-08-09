import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError } from "@/server/http";
import { repeatLastSet } from "@/server/services/workout.service";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json({ workout: await repeatLastSet(user.id, id) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
