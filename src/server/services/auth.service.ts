import "server-only";
import { prisma } from "@/server/db";
import { env } from "@/server/env";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "@/server/errors";
import { sendEmail } from "@/server/mailer";
import {
  hashPassword,
  simulatePasswordVerification,
  verifyPassword,
} from "@/server/auth/password";
import {
  createSession,
  destroyAllSessionsForUser,
  generateToken,
  hashToken,
  PASSWORD_RESET_TTL_MS,
  type IssuedSession,
} from "@/server/auth/session";
import type { AuthenticatedUser } from "@/server/auth/guard";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from "@/server/validation/auth";

const AUTHENTICATED_USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  preferredUnit: true,
  defaultRestSeconds: true,
} as const;

export interface AuthResult {
  user: AuthenticatedUser;
  session: IssuedSession;
}

/** Code Prisma d'une violation de contrainte d'unicité. */
const PRISMA_UNIQUE_VIOLATION = "P2002";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === PRISMA_UNIQUE_VIOLATION
  );
}

export async function registerUser(
  input: RegisterInput,
  userAgent?: string,
): Promise<AuthResult> {
  const passwordHash = await hashPassword(input.password);

  let user: AuthenticatedUser;
  try {
    user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        displayName: input.displayName,
      },
      select: AUTHENTICATED_USER_SELECT,
    });
  } catch (error) {
    // La contrainte d'unicité fait autorité : elle couvre aussi le cas où deux
    // inscriptions simultanées passeraient une vérification préalable.
    if (isUniqueViolation(error)) {
      throw new ConflictError("Un compte existe déjà avec cette adresse email.");
    }
    throw error;
  }

  const session = await createSession(user.id, userAgent);
  return { user, session };
}

export async function loginUser(input: LoginInput, userAgent?: string): Promise<AuthResult> {
  const record = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...AUTHENTICATED_USER_SELECT, passwordHash: true },
  });

  if (!record) {
    // Même coût qu'une vérification réelle : la durée de la réponse ne doit pas
    // révéler qu'aucun compte ne porte cette adresse.
    await simulatePasswordVerification();
    throw new UnauthorizedError("Email ou mot de passe incorrect.");
  }

  const passwordMatches = await verifyPassword(input.password, record.passwordHash);
  if (!passwordMatches) {
    throw new UnauthorizedError("Email ou mot de passe incorrect.");
  }

  const user: AuthenticatedUser = {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    preferredUnit: record.preferredUnit,
    defaultRestSeconds: record.defaultRestSeconds,
  };
  const session = await createSession(user.id, userAgent);
  return { user, session };
}

/**
 * Émet un lien de réinitialisation. Ne signale jamais si l'adresse est connue :
 * la réponse est identique dans les deux cas.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return;

  // Les demandes précédentes encore valides sont invalidées : un seul lien actif.
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  const token = generateToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });

  const resetUrl = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: email,
    subject: "Réinitialisation de votre mot de passe ForgeFit",
    body: [
      "Vous avez demandé à réinitialiser votre mot de passe.",
      "",
      `Lien (valable 1 heure) : ${resetUrl}`,
      "",
      "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
    ].join("\n"),
  });
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(input.token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt !== null || record.expiresAt.getTime() <= Date.now()) {
    throw new ValidationError("Ce lien de réinitialisation est invalide ou expiré.");
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Un mot de passe réinitialisé doit déconnecter les sessions existantes.
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<AuthenticatedUser> {
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: input,
      select: AUTHENTICATED_USER_SELECT,
    });
  } catch {
    throw new NotFoundError("Utilisateur introuvable.");
  }
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const record = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!record) throw new NotFoundError("Utilisateur introuvable.");

  const matches = await verifyPassword(input.currentPassword, record.passwordHash);
  if (!matches) throw new ValidationError("Mot de passe actuel incorrect.");

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await destroyAllSessionsForUser(userId);
}
