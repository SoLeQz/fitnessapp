import { NextResponse } from "next/server";
import { consumeRateLimit, rateLimitKey, PASSWORD_RESET_RULE } from "@/server/rate-limit";
import { handleRouteError, parseJsonBody } from "@/server/http";
import { resetPassword } from "@/server/services/auth.service";
import { resetPasswordSchema } from "@/server/validation/auth";

export async function POST(request: Request) {
  try {
    const key = rateLimitKey("reset-password", request.headers);
    consumeRateLimit(key, PASSWORD_RESET_RULE);

    const input = await parseJsonBody(request, resetPasswordSchema);
    await resetPassword(input);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
