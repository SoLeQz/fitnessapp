/**
 * Message affichable pour une erreur remontée par une Server Action.
 *
 * Next.js sérialise les erreurs des actions : côté client, on ne récupère qu'un
 * message (celui de l'erreur métier en développement, un texte générique en
 * production). Cette fonction garantit qu'un texte utilisable est toujours
 * affiché plutôt qu'un « [object Object] ».
 */
export function toDisplayMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "L'enregistrement a échoué. Réessayez.";
}
