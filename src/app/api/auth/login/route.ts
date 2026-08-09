import { NextResponse } from "next/server";
import { setSessionCookie } from "@/server/auth/session";
import { consumeRateLimit, rateLimitKey, AUTH_ATTEMPT_RULE, resetRateLimit } from "@/server/rate-limit";
import { handleRouteError, parseJsonBody } from "@/server/http";
import { loginUser } from "@/server/services/auth.service";
import { loginSchema } from "@/server/validation/auth";

export async function POST(request: Request) {
  try {
    const key = rateLimitKey("login", request.headers);
    consumeRateLimit(key, AUTH_ATTEMPT_RULE);

    const input = await parseJsonBody(request, loginSchema);
    const { user, session } = await loginUser(
      input,
      request.headers.get("user-agent")?.slice(0, 255) ?? undefined,
    );
    await setSessionCookie(session);
    // Une connexion réussie libère le quota : seul l'échec répété est puni.
    resetRateLimit(key);

    return NextResponse.json({ user });
  } catch (error) {
    return handleRouteError(error);
  }
}
