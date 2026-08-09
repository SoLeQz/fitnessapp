import "server-only";
import { z } from "zod";

/**
 * Variables d'environnement validées une seule fois au démarrage : une valeur
 * manquante fait échouer le serveur immédiatement plutôt qu'au milieu d'une
 * requête.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET doit faire au moins 32 caractères"),
  APP_URL: z.url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Configuration d'environnement invalide :\n${details}`);
}

export const env = parsed.data;
