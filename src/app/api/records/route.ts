import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError } from "@/server/http";
import { getAllRecords } from "@/server/services/analytics.service";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ records: await getAllRecords(user.id) });
  } catch (error) {
    return handleRouteError(error);
  }
}
