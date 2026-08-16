import type { CSSProperties } from "react";

/**
 * Ciel décoratif du tableau de bord : quelques étoiles fixes qui scintillent et
 * des étoiles filantes qui traversent l'écran par intermittence.
 *
 * Trois partis pris.
 *
 * 1. Tout est en CSS. Aucune boucle d'animation JavaScript ne tourne, le calque
 *    ne consomme rien et n'empêche jamais le thread principal de répondre à la
 *    saisie d'une série.
 * 2. Aucune valeur aléatoire au rendu. `Math.random()` produirait un balisage
 *    différent côté serveur et côté client, donc une erreur d'hydratation : la
 *    disposition vient d'un générateur à graine fixe, identique des deux côtés.
 * 3. Le calque est purement décoratif. `aria-hidden` l'écarte des lecteurs
 *    d'écran, `pointer-events-none` (porté par la classe `sky`) le rend
 *    transparent aux clics, et il disparaît entièrement quand le système
 *    demande moins d'animations.
 */

interface ShootingStar {
  /** Point de départ, en pourcentage du calque. */
  top: string;
  left: string;
  /** Direction du trajet. 90deg descend, 180deg va vers la gauche. */
  angle: string;
  /** Longueur du trajet, en unités de viewport. */
  distance: string;
  /** Longueur de la traînée, en pixels. */
  tail: string;
  delay: string;
  duration: string;
}

/**
 * Cinq trajectoires suffisent : les cycles sont longs et volontairement
 * désaccordés (13s, 17s, 19s, 23s, 29s — des durées premières entre elles), si
 * bien que les passages ne se resynchronisent jamais en une figure répétitive.
 * Une étoile file environ toutes les trois secondes, sans jamais deux fois le
 * même motif.
 */
const SHOOTING_STARS: ShootingStar[] = [
  { top: "-5%", left: "78%", angle: "158deg", distance: "115vmax", tail: "90px", delay: "0s", duration: "13s" },
  { top: "12%", left: "95%", angle: "150deg", distance: "125vmax", tail: "70px", delay: "4s", duration: "17s" },
  { top: "-8%", left: "45%", angle: "163deg", distance: "105vmax", tail: "110px", delay: "8s", duration: "19s" },
  { top: "30%", left: "88%", angle: "152deg", distance: "95vmax", tail: "60px", delay: "11s", duration: "23s" },
  { top: "-3%", left: "62%", angle: "156deg", distance: "120vmax", tail: "80px", delay: "15s", duration: "29s" },
];

interface StaticStar {
  top: string;
  left: string;
  size: string;
  opacityMin: string;
  opacityMax: string;
  delay: string;
  duration: string;
}

/**
 * Générateur congruentiel linéaire à graine fixe. Le tirage est déterministe :
 * la même suite de nombres est produite au build, au rendu serveur et au rendu
 * client, ce qui donne un ciel stable sans écrire cinquante positions à la main.
 */
function buildStaticStars(count: number): StaticStar[] {
  let seed = 20260810;
  const next = (): number => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  return Array.from({ length: count }, () => {
    // Les étoiles restent discrètes : jamais plus de 45% d'opacité, pour ne pas
    // concurrencer le contenu ni les chiffres d'une série.
    const opacityMax = 0.18 + next() * 0.27;
    return {
      top: `${(next() * 100).toFixed(2)}%`,
      left: `${(next() * 100).toFixed(2)}%`,
      size: next() > 0.82 ? "2px" : "1px",
      opacityMin: (opacityMax * 0.3).toFixed(3),
      opacityMax: opacityMax.toFixed(3),
      delay: `${(next() * 6).toFixed(2)}s`,
      duration: `${(3 + next() * 4).toFixed(2)}s`,
    };
  });
}

const STATIC_STARS = buildStaticStars(34);

export function ShootingStars() {
  return (
    <div className="sky" aria-hidden>
      {STATIC_STARS.map((star, index) => (
        <span
          key={`static-${index}`}
          className="sky-star"
          style={
            {
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              "--star-opacity-min": star.opacityMin,
              "--star-opacity-max": star.opacityMax,
              "--star-delay": star.delay,
              "--star-duration": star.duration,
            } as CSSProperties
          }
        />
      ))}

      {SHOOTING_STARS.map((star, index) => (
        <span
          key={`shooting-${index}`}
          className="sky-shooting-star"
          style={
            {
              top: star.top,
              left: star.left,
              "--star-angle": star.angle,
              "--star-distance": star.distance,
              "--star-tail": star.tail,
              "--star-delay": star.delay,
              "--star-duration": star.duration,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
