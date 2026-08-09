import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError } from "@/server/http";
import { setFavorite } from "@/server/services/exercise.service";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await setFavorite(user.id, id, true);
    return NextResponse.json({ isFavorite: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await setFavorite(user.id, id, false);
    return NextResponse.json({ isFavorite: false });
  } catch (error) {
    return handleRouteError(error);
  }
}
