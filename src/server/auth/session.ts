import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/server/db";
import { env } from "@/server/env";

export const SESSION_COOKIE_NAME = "forgefit_session";

/** Durée de vie fixe d'une session. Pas de prolongation glissante : la date
 * d'expiration en base et celle du cookie restent ainsi toujours cohérentes. */
const SESSION_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 jours

/** Durée de validité d'un lien de réinitialisation de mot de passe. */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 heure

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Le cookie transporte le jeton en clair, la base n'en stocke que l'empreinte :
 * une lecture de la table `sessions` ne permet pas d'usurper une session.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Comparaison à temps constant de deux empreintes hexadécimales. */
export function safeCompareHashes(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "hex");
  const bufferB = Buffer.from(b, "hex");
  if (bufferA.length !== bufferB.length || bufferA.length === 0) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export interface IssuedSession {
  token: string;
  expiresAt: Date;
}

export async function createSession(userId: string, userAgent?: string): Promise<IssuedSession> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt, userAgent: userAgent ?? null },
  });

  return { token, expiresAt };
}

/**
 * Écrit le cookie de session. À n'appeler que depuis une Server Action ou un
 * route handler : Next.js interdit d'écrire un cookie pendant le rendu.
 */
export async function setSessionCookie({ token, expiresAt }: IssuedSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function readSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/** Révoque la session portée par le cookie courant. */
export async function destroyCurrentSession(): Promise<void> {
  const token = await readSessionToken();
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  await clearSessionCookie();
}

/** Révoque toutes les sessions d'un utilisateur (changement de mot de passe). */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
