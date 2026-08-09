import { execFileSync } from "node:child_process";
import { config } from "dotenv";
import { Client } from "pg";

/**
 * Prépare une base de test jetable avant la suite : elle est créée si besoin,
 * puis les migrations y sont appliquées. Les tests d'intégration s'exécutent
 * ainsi contre le vrai schéma PostgreSQL — contraintes CHECK et index partiels
 * compris — sans jamais toucher à la base de développement.
 */
export default async function globalSetup(): Promise<void> {
  config({ path: ".env.test", override: true });

  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) throw new Error("DATABASE_URL manquant : vérifiez .env.test");

  const url = new URL(databaseUrl);
  const databaseName = url.pathname.replace(/^\//, "").split("?")[0];
  if (!databaseName) throw new Error("Nom de base introuvable dans DATABASE_URL");

  // Connexion à la base d'administration pour créer la base de test.
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres";
  adminUrl.search = "";

  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const existing = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      databaseName,
    ]);
    if (existing.rowCount === 0) {
      // Le nom vient de notre propre configuration, jamais d'une entrée
      // utilisateur ; il est tout de même échappé.
      await admin.query(`CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`);
    }
  } finally {
    await admin.end();
  }

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
