import { LoadUnit } from "@/generated/prisma/enums";
import { isConvertibleUnit, roundWeight } from "./load-unit";

/**
 * Vue minimale d'une série, indépendante de Prisma : `src/lib` reste du calcul
 * pur, testable sans base de données.
 */
export interface SetMetrics {
  weight: number | null;
  weightUnit: LoadUnit;
  weightKg: number | null;
  reps: number | null;
  isWarmup: boolean;
  isCompleted: boolean;
  durationSeconds: number | null;
  distanceMeters: number | null;
}

/**
 * Séries retenues dans les statistiques : réalisées, et hors échauffement.
 * Un échauffement gonflerait le volume sans refléter le travail réel.
 */
export function isWorkingSet(set: SetMetrics): boolean {
  return set.isCompleted && !set.isWarmup;
}

/** Volume d'une série en kilogrammes, `null` si la charge n'est pas une masse. */
export function setVolumeKg(set: SetMetrics): number | null {
  if (set.weightKg === null || set.reps === null || set.reps <= 0) return null;
  return roundWeight(set.weightKg * set.reps);
}

/** Volume total en kilogrammes des séries de travail convertibles. */
export function totalVolumeKg(sets: readonly SetMetrics[]): number {
  let total = 0;
  for (const set of sets) {
    if (!isWorkingSet(set)) continue;
    total += setVolumeKg(set) ?? 0;
  }
  return roundWeight(total);
}

/** Répétitions totales des séries de travail. */
export function totalReps(sets: readonly SetMetrics[]): number {
  let total = 0;
  for (const set of sets) {
    if (!isWorkingSet(set)) continue;
    total += set.reps ?? 0;
  }
  return total;
}

/**
 * Bornes de validité de l'estimation de 1RM. Au-delà de 12 répétitions la
 * formule diverge fortement de la réalité : on préfère ne rien afficher.
 */
export const ONE_REP_MAX_MAX_REPS = 12;

/**
 * 1RM estimé par la formule d'Epley : `charge x (1 + reps / 30)`.
 *
 * C'est une extrapolation mathématique à partir d'une série réalisée, utilisée
 * pour comparer des séries entre elles. Ce n'est jamais une charge à tenter.
 * Renvoie `null` hors du domaine de validité (unité non convertible, plus de
 * 12 répétitions, charge nulle).
 */
export function estimateOneRepMax(set: SetMetrics): number | null {
  if (!isConvertibleUnit(set.weightUnit)) return null;
  if (set.weightKg === null || set.weightKg <= 0) return null;
  if (set.reps === null || set.reps < 1 || set.reps > ONE_REP_MAX_MAX_REPS) return null;
  return roundWeight(set.weightKg * (1 + set.reps / 30), 1);
}

/** Meilleur 1RM estimé d'un ensemble de séries, `null` si aucune n'est éligible. */
export function bestEstimatedOneRepMax(sets: readonly SetMetrics[]): number | null {
  let best: number | null = null;
  for (const set of sets) {
    if (!isWorkingSet(set)) continue;
    const estimate = estimateOneRepMax(set);
    if (estimate !== null && (best === null || estimate > best)) best = estimate;
  }
  return best;
}

/**
 * Ordre de « qualité » entre deux séries : on privilégie le 1RM estimé quand il
 * est disponible (il arbitre correctement 65x8 contre 60x12), sinon la charge
 * brute — cas des niveaux de machine, incomparables en kilos — puis les
 * répétitions.
 *
 * Renvoie > 0 si `a` est meilleure que `b`.
 */
function compareSetQuality(a: SetMetrics, b: SetMetrics): number {
  const estimateA = estimateOneRepMax(a);
  const estimateB = estimateOneRepMax(b);
  if (estimateA !== null && estimateB !== null && estimateA !== estimateB) {
    return estimateA - estimateB;
  }

  const weightA = a.weightKg ?? a.weight ?? 0;
  const weightB = b.weightKg ?? b.weight ?? 0;
  if (weightA !== weightB) return weightA - weightB;

  const repsA = a.reps ?? 0;
  const repsB = b.reps ?? 0;
  if (repsA !== repsB) return repsA - repsB;

  return (a.durationSeconds ?? 0) - (b.durationSeconds ?? 0);
}

/** Meilleure série d'un ensemble, au sens de `compareSetQuality`. */
export function bestSet<T extends SetMetrics>(sets: readonly T[]): T | null {
  let best: T | null = null;
  for (const set of sets) {
    if (!isWorkingSet(set)) continue;
    if (best === null || compareSetQuality(set, best) > 0) best = set;
  }
  return best;
}

/** Charge la plus lourde des séries de travail, dans l'unité d'origine. */
export function heaviestWeight(sets: readonly SetMetrics[]): number | null {
  let best: number | null = null;
  for (const set of sets) {
    if (!isWorkingSet(set) || set.weight === null) continue;
    if (best === null || set.weight > best) best = set.weight;
  }
  return best;
}

/** Plus grand nombre de répétitions sur une série de travail. */
export function maxReps(sets: readonly SetMetrics[]): number | null {
  let best: number | null = null;
  for (const set of sets) {
    if (!isWorkingSet(set) || set.reps === null) continue;
    if (best === null || set.reps > best) best = set.reps;
  }
  return best;
}
