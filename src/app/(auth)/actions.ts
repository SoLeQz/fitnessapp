"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeInternalPath } from "@/lib/navigation";
import { destroyCurrentSession, setSessionCookie } from "@/server/auth/session";
import {
  AUTH_ATTEMPT_RULE,
  consumeRateLimit,
  PASSWORD_RESET_RULE,
  rateLimitKey,
  resetRateLimit,
} from "@/server/rate-limit";
import type { FormState } from "@/lib/form-state";
import { successState, toErrorState } from "@/server/form-state";
import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from "@/server/services/auth.service";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/server/validation/auth";

async function currentUserAgent(): Promise<string | undefined> {
  const headerList = await headers();
  return headerList.get("user-agent")?.slice(0, 255) ?? undefined;
}

/** Limite les tentatives sur un point d'entrée sensible. */
async function guardRate(action: string, rule = AUTH_ATTEMPT_RULE): Promise<string> {
  const key = rateLimitKey(action, await headers());
  consumeRateLimit(key, rule);
  return key;
}

/**
 * Les actions ne redirigent jamais depuis un bloc `try` : `redirect()`
 * fonctionne en levant une exception interne, qu'un `catch` avalerait.
 */
export async function registerAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await guardRate("register");
    const input = registerSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
      displayName: formData.get("displayName"),
    });
    const { session } = await registerUser(input, await currentUserAgent());
    await setSessionCookie(session);
  } catch (error) {
    return toErrorState(error);
  }

  redirect("/");
}

export async function loginAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const redirectTo = formData.get("redirectTo");

  try {
    const key = await guardRate("login");
    const input = loginSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    const { session } = await loginUser(input, await currentUserAgent());
    await setSessionCookie(session);
    // Une connexion réussie libère le quota : seul l'échec répété est puni.
    resetRateLimit(key);
  } catch (error) {
    return toErrorState(error);
  }

  redirect(safeInternalPath(typeof redirectTo === "string" ? redirectTo : null));
}

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/login");
}

export async function forgotPasswordAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await guardRate("forgot-password", PASSWORD_RESET_RULE);
    const input = forgotPasswordSchema.parse({ email: formData.get("email") });
    await requestPasswordReset(input.email);
  } catch (error) {
    return toErrorState(error);
  }

  // Réponse volontairement identique que l'adresse existe ou non.
  return successState(
    "Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.",
  );
}

export async function resetPasswordAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await guardRate("reset-password", PASSWORD_RESET_RULE);
    const input = resetPasswordSchema.parse({
      token: formData.get("token"),
      password: formData.get("password"),
    });
    await resetPassword(input);
  } catch (error) {
    return toErrorState(error);
  }

  redirect("/login?reset=1");
}
