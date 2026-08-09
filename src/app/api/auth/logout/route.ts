import { NextResponse } from "next/server";
import { destroyCurrentSession } from "@/server/auth/session";
import { handleRouteError } from "@/server/http";

export async function POST() {
  try {
    await destroyCurrentSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
