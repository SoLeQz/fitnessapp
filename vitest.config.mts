import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // `server-only` lève une exception hors du bundler Next. Les tests
      // exécutent les services directement : la garde est neutralisée ici, et
      // uniquement ici.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    globalSetup: ["./tests/setup/global-setup.ts"],
    setupFiles: ["./tests/setup/load-env.ts"],
    // Les tests d'intégration partagent une base : les exécuter en série évite
    // qu'ils se marchent dessus.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
