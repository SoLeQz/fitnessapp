import { formatWeight, roundWeight } from "./load-unit";
import { bestSet, estimateOneRepMax, type SetMetrics } from "./set-metrics";

export type ProgressionStatus = "up" | "flat" | "down";

export interface ProgressionComparison {
  status: ProgressionStatus;
  /** Écart de charge dans l'unité d'origine (`null` si non comparable). */
  weightDelta: number | null;
  /** Écart de répétitions sur la meilleure série. */
  repsDelta: number | null;
  /** Résumé lisible : « +5 kg », « +1 répétition », « stable ». */
  summary: string;
  /** Meilleure série retenue de chaque côté, pour l'affichage détaillé. */
  current: SetMetrics;
  previous: SetMetrics;
}

/**
 * Score comparable d'une série. Le 1RM estimé arbitre correctement les cas où
 * charge et répétitions bougent en sens inverse (60x12 -> 65x10). Quand il n'est
 * pas disponible (niveau de machine, séries au temps), on retombe sur la charge
 * brute puis sur les répétitions.
 */
function progressionScore(set: SetMetrics): number {
  const estimate = estimateOneRepMax(set);
  if (estimate !== null) return estimate;

  const weight = set.weightKg ?? set.weight;
  if (weight !== null && weight > 0) return weight * (1 + (set.reps ?? 1) / 30);

  if (set.reps !== null) return set.reps;
  return set.durationSeconds ?? 0;
}

function pluralize(count: number, singular: string, plural: string): string {
  return Math.abs(count) > 1 ? plural : singular;
}

function describe(current: SetMetrics, previous: SetMetrics): {
  weightDelta: number | null;
  repsDelta: number | null;
  summary: string;
} {
  const sameUnit = current.weightUnit === previous.weightUnit;
  const weightDelta =
    sameUnit && current.weight !== null && previous.weight !== null
      ? roundWeight(current.weight - previous.weight, 2)
      : null;
  const repsDelta =
    current.reps !== null && previous.reps !== null ? current.reps - previous.reps : null;

  const parts: string[] = [];
  if (weightDelta !== null && weightDelta !== 0) {
    const magnitude = formatWeight(Math.abs(weightDelta), current.weightUnit);
    if (magnitude !== null) parts.push(`${weightDelta > 0 ? "+" : "−"}${magnitude}`);
  }
  if (repsDelta !== null && repsDelta !== 0) {
    const sign = repsDelta > 0 ? "+" : "−";
    const word = pluralize(repsDelta, "répétition", "répétitions");
    parts.push(`${sign}${Math.abs(repsDelta)} ${word}`);
  }

  if (parts.length === 0) return { weightDelta, repsDelta, summary: "stable" };
  return { weightDelta, repsDelta, summary: parts.join(" · ") };
}

/**
 * Compare la meilleure série de la séance courante à celle de la précédente,
 * pour un même couple (exercice, variante). Renvoie `null` s'il n'y a pas de
 * point de comparaison.
 */
export function compareSessions(
  currentSets: readonly SetMetrics[],
  previousSets: readonly SetMetrics[],
): ProgressionComparison | null {
  const current = bestSet(currentSets);
  const previous = bestSet(previousSets);
  if (current === null || previous === null) return null;

  const currentScore = progressionScore(current);
  const previousScore = progressionScore(previous);

  // Tolérance de 1 % : un écart d'arrondi ne doit pas être annoncé comme une
  // régression.
  const threshold = Math.max(previousScore * 0.01, 0.001);
  let status: ProgressionStatus = "flat";
  if (currentScore > previousScore + threshold) status = "up";
  else if (currentScore < previousScore - threshold) status = "down";

  const { weightDelta, repsDelta, summary } = describe(current, previous);
  return { status, weightDelta, repsDelta, summary, current, previous };
}

export const PROGRESSION_INDICATOR: Record<ProgressionStatus, { emoji: string; label: string }> = {
  up: { emoji: "🟢", label: "Progression" },
  flat: { emoji: "🟡", label: "Stable" },
  down: { emoji: "🔴", label: "Régression" },
};

/** Variation relative entre deux valeurs, en pourcentage. `null` si non calculable. */
export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return roundWeight(((current - previous) / previous) * 100, 1);
}

/** Formate une variation relative : « +12.5 % », « −3 % », « = ». */
export function formatPercentChange(change: number | null): string {
  if (change === null) return "—";
  if (change === 0) return "=";
  const sign = change > 0 ? "+" : "−";
  return `${sign}${Math.abs(change)} %`;
}
