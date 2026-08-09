import { LoadUnit } from "@/generated/prisma/enums";

/**
 * Facteur légal (livre avoirdupois). Défini exactement pour que les
 * allers-retours kg <-> lbs restent stables au millième près, précision de la
 * colonne `Decimal(8,3)` en base.
 */
export const KG_PER_LB = 0.45359237;

/** Précision de stockage des charges : 3 décimales, comme en base. */
const WEIGHT_PRECISION = 3;

export type ConvertibleUnit = typeof LoadUnit.KG | typeof LoadUnit.LBS;

/**
 * Une unité est convertible si elle exprime une masse. Un niveau de machine
 * (`LEVEL`) ou le poids du corps ne le sont pas : ils ne doivent jamais entrer
 * dans un volume exprimé en kilogrammes.
 */
export function isConvertibleUnit(unit: LoadUnit): unit is ConvertibleUnit {
  return unit === LoadUnit.KG || unit === LoadUnit.LBS;
}

export function roundWeight(value: number, precision = WEIGHT_PRECISION): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

/**
 * Équivalent canonique en kilogrammes, ou `null` si l'unité n'exprime pas une
 * masse. C'est la seule fonction autorisée à produire `WorkoutSet.weightKg`.
 */
export function toKilograms(value: number | null, unit: LoadUnit): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  if (!isConvertibleUnit(unit)) return null;
  return roundWeight(unit === LoadUnit.KG ? value : value * KG_PER_LB);
}

/** Conversion inverse, pour réafficher une charge dans l'unité voulue. */
export function fromKilograms(kilograms: number | null, unit: LoadUnit): number | null {
  if (kilograms === null || !Number.isFinite(kilograms)) return null;
  if (!isConvertibleUnit(unit)) return null;
  return roundWeight(unit === LoadUnit.KG ? kilograms : kilograms / KG_PER_LB);
}

/** Conversion directe entre deux unités de masse. `null` si non convertible. */
export function convertWeight(value: number, from: LoadUnit, to: LoadUnit): number | null {
  const kilograms = toKilograms(value, from);
  if (kilograms === null) return null;
  return fromKilograms(kilograms, to);
}

/**
 * Arrondit une charge au pas de la machine (2.5 kg, 5 lbs, 1 niveau...).
 * Utilisé par les boutons +/- de la saisie rapide.
 */
export function roundToIncrement(value: number, increment: number): number {
  if (!Number.isFinite(increment) || increment <= 0) return roundWeight(value);
  return roundWeight(Math.round(value / increment) * increment);
}

const UNIT_SUFFIX: Record<LoadUnit, string> = {
  [LoadUnit.KG]: "kg",
  [LoadUnit.LBS]: "lbs",
  [LoadUnit.LEVEL]: "niv.",
  [LoadUnit.BODYWEIGHT]: "PdC",
  [LoadUnit.NONE]: "",
};

export function unitSuffix(unit: LoadUnit): string {
  return UNIT_SUFFIX[unit];
}

const UNIT_LABEL: Record<LoadUnit, string> = {
  [LoadUnit.KG]: "Kilogrammes",
  [LoadUnit.LBS]: "Livres",
  [LoadUnit.LEVEL]: "Niveau de machine",
  [LoadUnit.BODYWEIGHT]: "Poids du corps",
  [LoadUnit.NONE]: "Sans charge",
};

export function unitLabel(unit: LoadUnit): string {
  return UNIT_LABEL[unit];
}

/**
 * Affiche une charge sans décimale superflue : « 60 kg », « 62.5 kg »,
 * « niv. 8 ». Renvoie `null` quand il n'y a rien de pertinent à afficher.
 */
export function formatWeight(value: number | null, unit: LoadUnit): string | null {
  if (value === null || !Number.isFinite(value)) return null;
  if (unit === LoadUnit.BODYWEIGHT) return "Poids du corps";
  if (unit === LoadUnit.NONE) return null;

  const rounded = roundWeight(value, 2);
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0$/, "");
  return unit === LoadUnit.LEVEL ? `niv. ${text}` : `${text} ${unitSuffix(unit)}`;
}
