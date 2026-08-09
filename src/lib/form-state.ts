import type { ZodError } from "zod";

/**
 * État partagé entre une Server Action de formulaire et le composant client qui
 * la consomme via `useActionState`.
 *
 * Ce module ne contient que des types et des fonctions pures : il est importable
 * des deux côtés de la frontière serveur/client.
 */
export interface FormState {
  status: "idle" | "error" | "success";
  message?: string;
  /** Erreurs par nom de champ, telles qu'affichées sous chaque saisie. */
  fieldErrors?: Record<string, string[]>;
}

export const INITIAL_FORM_STATE: FormState = { status: "idle" };

/** Regroupe les problèmes Zod par chemin de champ. */
export function flattenZodError(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_";
    (details[key] ??= []).push(issue.message);
  }
  return details;
}

/** Première erreur d'un champ, pour l'affichage sous le contrôle. */
export function fieldError(state: FormState, name: string): string | undefined {
  return state.fieldErrors?.[name]?.[0];
}
