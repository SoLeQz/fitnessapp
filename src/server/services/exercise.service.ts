import type { Prisma } from "@/generated/prisma/client";
import { LoadUnit, WorkoutStatus } from "@/generated/prisma/enums";
import { normalizeName, searchTerms } from "@/lib/text";
import { prisma } from "@/server/db";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { decimalToNumber } from "@/server/prisma-utils";
import type {
  CreateExerciseInput,
  CreateVariantInput,
  ExerciseFilters,
  UpdateExerciseInput,
  UpdateVariantInput,
} from "@/server/validation/exercise";

/**
 * Un exercice est visible s'il appartient au catalogue commun ou à
 * l'utilisateur. Ce filtre est appliqué à *toute* lecture : connaître un
 * identifiant ne donne aucun accès.
 */
function visibleToUser(userId: string): Prisma.ExerciseWhereInput {
  return { OR: [{ ownerId: null }, { ownerId: userId }] };
}

const EXERCISE_SELECT = {
  id: true,
  ownerId: true,
  name: true,
  muscleGroup: true,
  secondaryMuscles: true,
  category: true,
  trackingMode: true,
  defaultUnit: true,
  description: true,
  imageUrl: true,
  isArchived: true,
} as const satisfies Prisma.ExerciseSelect;

export type ExerciseSummary = Prisma.ExerciseGetPayload<{ select: typeof EXERCISE_SELECT }> & {
  isFavorite: boolean;
  isCustom: boolean;
  variantCount: number;
  lastPerformedAt: Date | null;
};

export interface ExerciseVariantView {
  id: string;
  label: string;
  unit: LoadUnit;
  weightIncrement: number;
  notes: string | null;
  isDefault: boolean;
  isArchived: boolean;
}

export type ExerciseDetail = ExerciseSummary & { variants: ExerciseVariantView[] };

function toVariantView(variant: {
  id: string;
  label: string;
  unit: LoadUnit;
  weightIncrement: Prisma.Decimal;
  notes: string | null;
  isDefault: boolean;
  isArchived: boolean;
}): ExerciseVariantView {
  return {
    id: variant.id,
    label: variant.label,
    unit: variant.unit,
    weightIncrement: decimalToNumber(variant.weightIncrement) ?? 2.5,
    notes: variant.notes,
    isDefault: variant.isDefault,
    isArchived: variant.isArchived,
  };
}

/**
 * Bibliothèque filtrée. La recherche exige que *tous* les termes soient
 * présents dans le nom normalisé, ce qui rend « press chest » aussi efficace
 * que « chest press ».
 */
export async function listExercises(
  userId: string,
  filters: ExerciseFilters = {},
): Promise<ExerciseSummary[]> {
  const conditions: Prisma.ExerciseWhereInput[] = [visibleToUser(userId)];

  if (!filters.includeArchived) conditions.push({ isArchived: false });
  if (filters.muscleGroup) conditions.push({ muscleGroup: filters.muscleGroup });
  if (filters.category) conditions.push({ category: filters.category });
  if (filters.mineOnly) conditions.push({ ownerId: userId });
  if (filters.favoritesOnly) conditions.push({ favorites: { some: { userId } } });

  for (const term of searchTerms(filters.query ?? "")) {
    conditions.push({ normalizedName: { contains: term } });
  }

  const rows = await prisma.exercise.findMany({
    where: { AND: conditions },
    select: {
      ...EXERCISE_SELECT,
      favorites: { where: { userId }, select: { userId: true } },
      _count: { select: { variants: { where: { userId, isArchived: false } } } },
    },
    orderBy: [{ name: "asc" }],
  });

  const lastPerformed = await lastPerformedByExercise(
    userId,
    rows.map((row) => row.id),
  );

  return rows.map(({ favorites, _count, ...exercise }) => ({
    ...exercise,
    isFavorite: favorites.length > 0,
    isCustom: exercise.ownerId !== null,
    variantCount: _count.variants,
    lastPerformedAt: lastPerformed.get(exercise.id) ?? null,
  }));
}

/** Date de la dernière séance contenant chaque exercice, en une seule requête. */
async function lastPerformedByExercise(
  userId: string,
  exerciseIds: string[],
): Promise<Map<string, Date>> {
  if (exerciseIds.length === 0) return new Map();

  const rows = await prisma.workoutExercise.findMany({
    where: {
      exerciseId: { in: exerciseIds },
      workout: { userId, status: WorkoutStatus.COMPLETED },
    },
    select: { exerciseId: true, workout: { select: { startedAt: true } } },
    orderBy: { workout: { startedAt: "desc" } },
  });

  const result = new Map<string, Date>();
  for (const row of rows) {
    if (!result.has(row.exerciseId)) result.set(row.exerciseId, row.workout.startedAt);
  }
  return result;
}

export async function getExercise(userId: string, exerciseId: string): Promise<ExerciseDetail> {
  const exercise = await prisma.exercise.findFirst({
    where: { id: exerciseId, AND: visibleToUser(userId) },
    select: {
      ...EXERCISE_SELECT,
      favorites: { where: { userId }, select: { userId: true } },
      variants: {
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { label: "asc" }],
        select: {
          id: true,
          label: true,
          unit: true,
          weightIncrement: true,
          notes: true,
          isDefault: true,
          isArchived: true,
        },
      },
    },
  });

  if (!exercise) throw new NotFoundError("Exercice introuvable.");

  const lastPerformed = await lastPerformedByExercise(userId, [exercise.id]);
  const { favorites, variants, ...rest } = exercise;

  return {
    ...rest,
    isFavorite: favorites.length > 0,
    isCustom: rest.ownerId !== null,
    variantCount: variants.filter((variant) => !variant.isArchived).length,
    lastPerformedAt: lastPerformed.get(exercise.id) ?? null,
    variants: variants.map(toVariantView),
  };
}

/** Charge un exercice modifiable, en refusant explicitement le catalogue commun. */
async function requireOwnedExercise(userId: string, exerciseId: string): Promise<{ id: string }> {
  const exercise = await prisma.exercise.findFirst({
    where: { id: exerciseId, AND: visibleToUser(userId) },
    select: { id: true, ownerId: true },
  });

  if (!exercise) throw new NotFoundError("Exercice introuvable.");
  if (exercise.ownerId === null) {
    throw new ForbiddenError("Les exercices du catalogue commun ne peuvent pas être modifiés.");
  }
  return { id: exercise.id };
}

export async function createExercise(
  userId: string,
  input: CreateExerciseInput,
): Promise<ExerciseDetail> {
  const normalizedName = normalizeName(input.name);

  // L'unicité est aussi garantie en base ; ce contrôle sert à renvoyer un
  // message clair plutôt qu'une erreur de contrainte.
  const clash = await prisma.exercise.findFirst({
    where: { normalizedName, OR: [{ ownerId: null }, { ownerId: userId }] },
    select: { ownerId: true },
  });
  if (clash) {
    throw new ConflictError(
      clash.ownerId === null
        ? "Un exercice de la bibliothèque porte déjà ce nom."
        : "Vous avez déjà un exercice portant ce nom.",
    );
  }

  const created = await prisma.exercise.create({
    data: {
      ownerId: userId,
      name: input.name,
      normalizedName,
      muscleGroup: input.muscleGroup,
      secondaryMuscles: input.secondaryMuscles,
      category: input.category,
      trackingMode: input.trackingMode,
      defaultUnit: input.defaultUnit,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
    },
    select: { id: true },
  });

  return getExercise(userId, created.id);
}

export async function updateExercise(
  userId: string,
  exerciseId: string,
  input: UpdateExerciseInput,
): Promise<ExerciseDetail> {
  const owned = await requireOwnedExercise(userId, exerciseId);

  const data: Prisma.ExerciseUpdateInput = {};
  if (input.name !== undefined) {
    const normalizedName = normalizeName(input.name);
    const clash = await prisma.exercise.findFirst({
      where: {
        normalizedName,
        id: { not: owned.id },
        OR: [{ ownerId: null }, { ownerId: userId }],
      },
      select: { id: true },
    });
    if (clash) throw new ConflictError("Un exercice porte déjà ce nom.");
    data.name = input.name;
    data.normalizedName = normalizedName;
  }
  if (input.muscleGroup !== undefined) data.muscleGroup = input.muscleGroup;
  if (input.secondaryMuscles !== undefined) data.secondaryMuscles = input.secondaryMuscles;
  if (input.category !== undefined) data.category = input.category;
  if (input.trackingMode !== undefined) data.trackingMode = input.trackingMode;
  if (input.defaultUnit !== undefined) data.defaultUnit = input.defaultUnit;
  if (input.description !== undefined) data.description = input.description || null;
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl || null;
  if (input.isArchived !== undefined) data.isArchived = input.isArchived;

  await prisma.exercise.update({ where: { id: owned.id }, data });
  return getExercise(userId, owned.id);
}

/**
 * Supprime un exercice personnel, ou l'archive s'il est déjà utilisé : une
 * suppression détruirait l'historique qui s'y rattache.
 */
export async function deleteExercise(
  userId: string,
  exerciseId: string,
): Promise<{ deleted: boolean }> {
  const owned = await requireOwnedExercise(userId, exerciseId);

  const usage = await prisma.workoutExercise.count({ where: { exerciseId: owned.id } });
  if (usage > 0) {
    await prisma.exercise.update({ where: { id: owned.id }, data: { isArchived: true } });
    return { deleted: false };
  }

  await prisma.exercise.delete({ where: { id: owned.id } });
  return { deleted: true };
}

export async function setFavorite(
  userId: string,
  exerciseId: string,
  favorite: boolean,
): Promise<void> {
  const exists = await prisma.exercise.findFirst({
    where: { id: exerciseId, AND: visibleToUser(userId) },
    select: { id: true },
  });
  if (!exists) throw new NotFoundError("Exercice introuvable.");

  if (favorite) {
    await prisma.exerciseFavorite.upsert({
      where: { userId_exerciseId: { userId, exerciseId } },
      create: { userId, exerciseId },
      update: {},
    });
  } else {
    await prisma.exerciseFavorite.deleteMany({ where: { userId, exerciseId } });
  }
}

// ---------------------------------------------------------------------------
// Variantes de machine
// ---------------------------------------------------------------------------

/** Une variante n'a de sens qu'avec une unité de charge réellement mesurable. */
const ALLOWED_VARIANT_UNITS: LoadUnit[] = [LoadUnit.KG, LoadUnit.LBS, LoadUnit.LEVEL];

export async function createVariant(
  userId: string,
  exerciseId: string,
  input: CreateVariantInput,
): Promise<ExerciseVariantView> {
  const exercise = await prisma.exercise.findFirst({
    where: { id: exerciseId, AND: visibleToUser(userId) },
    select: { id: true },
  });
  if (!exercise) throw new NotFoundError("Exercice introuvable.");

  if (!ALLOWED_VARIANT_UNITS.includes(input.unit)) {
    throw new ValidationError("Une variante doit utiliser des kilos, des livres ou des niveaux.");
  }

  const duplicate = await prisma.exerciseVariant.findUnique({
    where: { userId_exerciseId_label: { userId, exerciseId, label: input.label } },
    select: { id: true },
  });
  if (duplicate) throw new ConflictError("Vous avez déjà une variante portant ce nom.");

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.exerciseVariant.updateMany({
        where: { userId, exerciseId },
        data: { isDefault: false },
      });
    }

    const created = await tx.exerciseVariant.create({
      data: {
        userId,
        exerciseId,
        label: input.label,
        unit: input.unit,
        weightIncrement: input.weightIncrement,
        notes: input.notes ?? null,
        isDefault: input.isDefault,
      },
      select: {
        id: true,
        label: true,
        unit: true,
        weightIncrement: true,
        notes: true,
        isDefault: true,
        isArchived: true,
      },
    });
    return toVariantView(created);
  });
}

export async function updateVariant(
  userId: string,
  variantId: string,
  input: UpdateVariantInput,
): Promise<ExerciseVariantView> {
  const variant = await prisma.exerciseVariant.findFirst({
    where: { id: variantId, userId },
    select: { id: true, exerciseId: true },
  });
  if (!variant) throw new NotFoundError("Variante introuvable.");

  if (input.unit !== undefined && !ALLOWED_VARIANT_UNITS.includes(input.unit)) {
    throw new ValidationError("Une variante doit utiliser des kilos, des livres ou des niveaux.");
  }

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.exerciseVariant.updateMany({
        where: { userId, exerciseId: variant.exerciseId },
        data: { isDefault: false },
      });
    }

    const updated = await tx.exerciseVariant.update({
      where: { id: variant.id },
      data: {
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.weightIncrement !== undefined
          ? { weightIncrement: input.weightIncrement }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
      },
      select: {
        id: true,
        label: true,
        unit: true,
        weightIncrement: true,
        notes: true,
        isDefault: true,
        isArchived: true,
      },
    });
    return toVariantView(updated);
  });
}

/**
 * Supprime une variante, ou l'archive si des séances y font référence : les
 * séries passées doivent rester rattachées à la machine sur laquelle elles ont
 * été réalisées.
 */
export async function deleteVariant(
  userId: string,
  variantId: string,
): Promise<{ deleted: boolean }> {
  const variant = await prisma.exerciseVariant.findFirst({
    where: { id: variantId, userId },
    select: { id: true },
  });
  if (!variant) throw new NotFoundError("Variante introuvable.");

  const usage = await prisma.workoutExercise.count({ where: { variantId: variant.id } });
  if (usage > 0) {
    await prisma.exerciseVariant.update({
      where: { id: variant.id },
      data: { isArchived: true },
    });
    return { deleted: false };
  }

  await prisma.exerciseVariant.delete({ where: { id: variant.id } });
  return { deleted: true };
}
