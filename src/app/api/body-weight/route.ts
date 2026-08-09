import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError, parseJsonBody } from "@/server/http";
import {
  getBodyWeightSummary,
  recordBodyWeight,
} from "@/server/services/body-weight.service";
import { recordBodyWeightSchema } from "@/server/validation/body-weight";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ summary: await getBodyWeightSummary(user.id) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = await parseJsonBody(request, recordBodyWeightSchema);
    return NextResponse.json({ entry: await recordBodyWeight(user.id, input) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
