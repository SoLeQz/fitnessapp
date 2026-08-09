import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError, parseJsonBody } from "@/server/http";
import { updateProfile } from "@/server/services/auth.service";
import { updateProfileSchema } from "@/server/validation/auth";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ user });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const current = await requireUser();
    const input = await parseJsonBody(request, updateProfileSchema);
    const user = await updateProfile(current.id, input);
    return NextResponse.json({ user });
  } catch (error) {
    return handleRouteError(error);
  }
}
