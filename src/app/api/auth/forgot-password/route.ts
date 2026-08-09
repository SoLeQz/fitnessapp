import { NextResponse } from "next/server";
import { consumeRateLimit, rateLimitKey, PASSWORD_RESET_RULE } from "@/server/rate-limit";
import { handleRouteError, parseJsonBody } from "@/server/http";
import { requestPasswordReset } from "@/server/services/auth.service";
import { forgotPasswordSchema } from "@/server/validation/auth";

export async function POST(request: Request) {
  try {
    const key = rateLimitKey("forgot-password", request.headers);
    consumeRateLimit(key, PASSWORD_RESET_RULE);

    const input = await parseJsonBody(request, forgotPasswordSchema);
    await requestPasswordReset(input.email);
    // Réponse identique que l'adresse existe ou non : l'API ne doit pas
    // permettre d'énumérer les comptes.
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
