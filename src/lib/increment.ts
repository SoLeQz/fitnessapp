import { LoadUnit } from "@/generated/prisma/enums";

/**
 * Pas d'incrément proposé quand aucune variante de machine n'en définit un :
 * le plus petit disque courant en salle pour les kilos et les livres, un cran
 * pour une machine graduée en niveaux.
 */
const DEFAULT_INCREMENT: Record<LoadUnit, number> = {
  [LoadUnit.KG]: 2.5,
  [LoadUnit.LBS]: 5,
  [LoadUnit.LEVEL]: 1,
  [LoadUnit.BODYWEIGHT]: 1,
  [LoadUnit.NONE]: 1,
};

export function defaultIncrementFor(unit: LoadUnit): number {
  return DEFAULT_INCREMENT[unit];
}
