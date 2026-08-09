import { differenceInCalendarDays } from "date-fns";
import type { Prisma } from "@/generated/prisma/client";
import { LoadUnit } from "@/generated/prisma/enums";
import { fromKilograms, roundWeight, toKilograms } from "@/lib/load-unit";
import { prisma } from "@/server/db";
import { NotFoundError, ValidationError } from "@/server/errors";
import { decimalToNumber } from "@/server/prisma-utils";

export interface BodyWeightEntryView {
  id: string;
  weightKg: number;
  /** Valeur réaffichée dans l'unité de saisie. */
  displayWeight: number;
  unit: LoadUnit;
  measuredOn: Date;
  notes: string | null;
}

export interface BodyWeightSummary {
  entries: BodyWeightEntryView[];
  current: BodyWeightEntryView | null;
  /** Écarts en kilogrammes ; `null` faute de point de comparaison. */
  change7Days: number | null;
  change30Days: number | null;
  changeTotal: number | null;
  highest: BodyWeightEntryView | null;
  lowest: BodyWeightEntryView | null;
}

interface StoredBodyWeight {
  id: string;
  weightKg: Prisma.Decimal;
  unit: LoadUnit;
  measuredOn: Date;
  notes: string | null;
}

function toView(entry: StoredBodyWeight): BodyWeightEntryView {
  const kilograms = decimalToNumber(entry.weightKg) ?? 0;
  return {
    id: entry.id,
    weightKg: kilograms,
    displayWeight: fromKilograms(kilograms, entry.unit) ?? kilograms,
    unit: entry.unit,
    measuredOn: entry.measuredOn,
    notes: entry.notes,
  };
}

export async function getBodyWeightSummary(userId: string): Promise<BodyWeightSummary> {
  const rows = await prisma.bodyWeightEntry.findMany({
    where: { userId },
    orderBy: { measuredOn: "desc" },
    take: 400,
    select: { id: true, weightKg: true, unit: true, measuredOn: true, notes: true },
  });

  const entries = rows.map(toView);
  const current = entries[0] ?? null;

  if (!current) {
    return {
      entries,
      current: null,
      change7Days: null,
      change30Days: null,
      changeTotal: null,
      highest: null,
      lowest: null,
    };
  }

  /**
   * Écart sur N jours : on compare à la pesée la plus proche d'il y a N jours,
   * en n'acceptant que celles antérieures — sinon une pesée d'hier ferait
   * office de « il y a 30 jours ».
   */
  const changeOver = (days: number): number | null => {
    const reference = entries
      .slice(1)
      .find(
        (entry) => differenceInCalendarDays(current.measuredOn, entry.measuredOn) >= days,
      );
    return reference ? roundWeight(current.weightKg - reference.weightKg, 2) : null;
  };

  const oldest = entries.at(-1) ?? null;

  return {
    entries,
    current,
    change7Days: changeOver(7),
    change30Days: changeOver(30),
    changeTotal:
      oldest && oldest.id !== current.id
        ? roundWeight(current.weightKg - oldest.weightKg, 2)
        : null,
    highest: entries.reduce<BodyWeightEntryView | null>(
      (best, entry) => (best === null || entry.weightKg > best.weightKg ? entry : best),
      null,
    ),
    lowest: entries.reduce<BodyWeightEntryView | null>(
      (best, entry) => (best === null || entry.weightKg < best.weightKg ? entry : best),
      null,
    ),
  };
}

export interface RecordBodyWeightInput {
  weight: number;
  unit: LoadUnit;
  measuredOn: Date;
  notes?: string | null;
}

/**
 * Enregistre une pesée. Une seule par jour : ressaisir le même jour corrige la
 * valeur au lieu d'empiler des doublons.
 */
export async function recordBodyWeight(
  userId: string,
  input: RecordBodyWeightInput,
): Promise<BodyWeightEntryView> {
  const kilograms = toKilograms(input.weight, input.unit);
  if (kilograms === null || kilograms <= 0) {
    throw new ValidationError("Le poids doit être exprimé en kilogrammes ou en livres.");
  }

  const measuredOn = normalizeToDay(input.measuredOn);

  const entry = await prisma.bodyWeightEntry.upsert({
    where: { userId_measuredOn: { userId, measuredOn } },
    create: {
      userId,
      measuredOn,
      weightKg: kilograms,
      unit: input.unit,
      notes: input.notes ?? null,
    },
    update: {
      weightKg: kilograms,
      unit: input.unit,
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
    },
    select: { id: true, weightKg: true, unit: true, measuredOn: true, notes: true },
  });

  return toView(entry);
}

export async function deleteBodyWeightEntry(userId: string, entryId: string): Promise<void> {
  const deleted = await prisma.bodyWeightEntry.deleteMany({ where: { id: entryId, userId } });
  if (deleted.count === 0) throw new NotFoundError("Pesée introuvable.");
}

/** Ramène une date à minuit UTC : la colonne est de type `date`. */
function normalizeToDay(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}
