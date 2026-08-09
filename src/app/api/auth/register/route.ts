import { NextResponse } from "next/server";
import { setSessionCookie } from "@/server/auth/session";
import { consumeRateLimit, rateLimitKey, AUTH_ATTEMPT_RULE } from "@/server/rate-limit";
import { handleRouteError, parseJsonBody } from "@/server/http";
import { registerUser } from "@/server/services/auth.service";
import { registerSchema } from "@/server/validation/auth";

export async function POST(request: Request) {
  try {
    const key = rateLimitKey("register", request.headers);
    consumeRateLimit(key, AUTH_ATTEMPT_RULE);

    const input = await parseJsonBody(request, registerSchema);
    const { user, session } = await registerUser(
      input,
      request.headers.get("user-agent")?.slice(0, 255) ?? undefined,
    );
    await setSessionCookie(session);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
