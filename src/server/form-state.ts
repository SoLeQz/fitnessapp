import { ZodError } from "zod";
import { flattenZodError, type FormState } from "@/lib/form-state";
import { AppError } from "./errors";

/**
 * Traduit une exception en état de formulaire. Comme pour l'API, une erreur
 * inattendue n'expose jamais son message : elle est journalisée côté serveur.
 */
export function toErrorState(error: unknown): FormState {
  if (error instanceof ZodError) {
    return {
      status: "error",
      message: "Veuillez corriger les champs signalés.",
      fieldErrors: flattenZodError(error),
    };
  }

  if (error instanceof AppError) {
    return {
      status: "error",
      message: error.message,
      ...(error.details ? { fieldErrors: error.details } : {}),
    };
  }

  console.error("Erreur non gérée dans une action :", error);
  return { status: "error", message: "Une erreur inattendue est survenue." };
}

export function successState(message: string): FormState {
  return { status: "success", message };
}
