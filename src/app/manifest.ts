import type { MetadataRoute } from "next";

/**
 * Manifeste PWA : permet d'installer ForgeFit sur l'écran d'accueil et de
 * l'ouvrir en plein écran, sans barre d'adresse — ce qui compte quand on
 * l'utilise entre deux séries.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ForgeFit — suivi de musculation",
    short_name: "ForgeFit",
    description: "Séances, charges, progression et records personnels.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0b0e",
    theme_color: "#0a0b0e",
    lang: "fr",
    categories: ["fitness", "health", "sports"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
