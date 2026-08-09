import { config } from "dotenv";

// Les tests visent une base dédiée : `.env.test` est chargé en priorité, puis
// `.env` complète les variables manquantes (AUTH_SECRET, APP_URL...).
config({ path: ".env.test", override: true });
config({ path: ".env" });
