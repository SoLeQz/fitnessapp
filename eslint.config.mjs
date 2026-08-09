import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * Configuration plate ESLint 9. `eslint-config-next` 16 expose directement des
 * configs plates : la couche de compatibilité `FlatCompat` n'est plus
 * nécessaire (et ne fonctionne plus avec cette version).
 */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      // Client Prisma généré : il n'est pas écrit à la main.
      "src/generated/**",
    ],
  },
  ...coreWebVitals,
  ...typescript,
];

export default eslintConfig;
