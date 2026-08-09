import type { Route } from "next";

/**
 * Valide une destination de redirection fournie par une requête.
 *
 * Seuls les chemins internes sont acceptés : `//exemple.com` ou une URL absolue
 * permettraient une redirection ouverte vers un site tiers. La conversion vers
 * `Route` est un cast assumé — la valeur vient de l'exécution, `typedRoutes` ne
 * peut donc pas la vérifier statiquement ; c'est ce contrôle qui en tient lieu.
 */
export function safeInternalPath(
  candidate: string | null | undefined,
  fallback: Route = "/",
): Route {
  if (typeof candidate !== "string" || candidate.length === 0) return fallback;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  if (candidate.includes("\\")) return fallback;
  return candidate as Route;
}
