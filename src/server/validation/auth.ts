import { z } from "zod";
import { LoadUnit } from "@/generated/prisma/enums";

/** Longueur minimale imposée aux mots de passe. */
export const MIN_PASSWORD_LENGTH = 10;

export const emailSchema = z
  .email("Adresse email invalide")
  .max(254)
  .transform((value) => value.trim().toLowerCase());

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères`)
  // bcrypt ignore les octets au-delà de 72 : refuser explicitement évite qu'un
  // mot de passe très long donne une fausse impression de robustesse.
  .max(72, "Le mot de passe ne peut pas dépasser 72 caractères");

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Le nom doit faire au moins 2 caractères")
  .max(60, "Le nom ne peut pas dépasser 60 caractères");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Jeton manquant"),
  password: passwordSchema,
});

export const updateProfileSchema = z.object({
  displayName: displayNameSchema.optional(),
  preferredUnit: z.enum([LoadUnit.KG, LoadUnit.LBS]).optional(),
  defaultRestSeconds: z
    .number()
    .int()
    .min(0, "Le repos ne peut pas être négatif")
    .max(3600, "Le repos ne peut pas dépasser une heure")
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
