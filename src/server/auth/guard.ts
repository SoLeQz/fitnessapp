import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { LoadUnit } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import { UnauthorizedError } from "@/server/errors";
import { hashToken, readSessionToken } from "./session";

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  preferredUnit: LoadUnit;
  defaultRestSeconds: number;
}

/**
 * Résout l'utilisateur courant. `cache` mémorise le résultat pour la durée de
 * la requête : un rendu qui interroge l'utilisateur dans dix composants ne
 * déclenche qu'une seule requête SQL.
 */
export const getCurrentUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const token = await readSessionToken();
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          preferredUnit: true,
          defaultRestSeconds: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;

  return session.user;
});

/**
 * Garde des route handlers et des Server Actions : lève une erreur 401 traduite
 * en réponse HTTP par `handleRouteError`.
 */
export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Garde des pages : redirige vers la connexion au lieu de lever une erreur. */
export async function requireUserPage(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
