import "server-only";
import { AppError } from "./errors";

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number) {
    super(
      `Trop de tentatives. Réessayez dans ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
      "RATE_LIMITED",
      429,
    );
  }
}

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Limiteur de débit en mémoire.
 *
 * Il protège les points d'entrée d'authentification contre le bourrinage de
 * mots de passe et l'envoi en masse d'emails de réinitialisation. Le compteur
 * étant local au processus, une exécution multi-instances doit le remplacer par
 * un compteur partagé (Redis) — c'est le seul endroit à changer.
 */
const windows = new Map<string, Window>();

/** Purge des fenêtres expirées, pour que la table ne grossisse pas sans fin. */
function evictExpired(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export interface RateLimitRule {
  /** Nombre de tentatives autorisées par fenêtre. */
  limit: number;
  /** Durée de la fenêtre, en secondes. */
  windowSeconds: number;
}

export const AUTH_ATTEMPT_RULE: RateLimitRule = { limit: 10, windowSeconds: 300 };
export const PASSWORD_RESET_RULE: RateLimitRule = { limit: 5, windowSeconds: 3600 };

/**
 * Consomme une tentative pour la clé donnée et lève `RateLimitError` si le
 * quota est dépassé.
 */
export function consumeRateLimit(key: string, rule: RateLimitRule): void {
  const now = Date.now();
  if (windows.size > 5000) evictExpired(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + rule.windowSeconds * 1000 });
    return;
  }

  existing.count += 1;
  if (existing.count > rule.limit) {
    throw new RateLimitError(Math.ceil((existing.resetAt - now) / 1000));
  }
}

/** Remet à zéro le compteur, après une authentification réussie par exemple. */
export function resetRateLimit(key: string): void {
  windows.delete(key);
}

/**
 * Identifie l'appelant pour le comptage. On combine l'adresse déclarée par le
 * proxy et l'action visée ; à défaut d'adresse fiable, une clé partagée limite
 * quand même le débit global de l'application.
 */
export function rateLimitKey(action: string, request: Headers, identifier?: string): string {
  const forwarded = request.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.get("x-real-ip") || "inconnu";
  return `${action}:${ip}:${identifier ?? ""}`;
}
