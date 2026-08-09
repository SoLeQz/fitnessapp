import type { NextConfig } from "next";

/**
 * En-têtes de sécurité appliqués à toutes les réponses.
 *
 * Pas de Content-Security-Policy stricte ici : Next.js injecte des scripts
 * inline nécessitant une nonce par requête, ce qui se règle dans un middleware
 * dédié. Les en-têtes ci-dessous couvrent les risques les plus courants sans
 * casser le rendu.
 */
const SECURITY_HEADERS = [
  // Interdit l'affichage de l'application dans une iframe tierce (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Empêche le navigateur de deviner un type MIME différent de celui annoncé.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Ne transmet que l'origine aux sites tiers, jamais le chemin complet.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // L'application n'a besoin d'aucune de ces API.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  serverExternalPackages: ["@prisma/client", "bcryptjs"],

  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
