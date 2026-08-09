import { randomUUID } from "node:crypto";
import { ExerciseCategory, MuscleGroup, LoadUnit } from "@/generated/prisma/enums";
import { normalizeName } from "@/lib/text";
import { prisma } from "@/server/db";

/**
 * Fabriques de données de test. Chaque test crée ses propres utilisateurs avec
 * un email unique, puis les supprime : la suppression en cascade emporte
 * séances, séries, records et variantes.
 */

export async function createTestUser(displayName = "Testeur") {
  return prisma.user.create({
    data: {
      email: `test-${randomUUID()}@forgefit.test`,
      passwordHash: "$2b$12$placeholder-non-utilise-dans-ces-tests",
      displayName,
    },
    select: { id: true, email: true, displayName: true },
  });
}

export async function deleteTestUsers(...userIds: string[]): Promise<void> {
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

/** Exercice du catalogue commun, réutilisé s'il existe déjà. */
export async function ensureCatalogExercise(name: string) {
  const normalizedName = normalizeName(name);
  const existing = await prisma.exercise.findFirst({
    where: { ownerId: null, normalizedName },
    select: { id: true, name: true, defaultUnit: true },
  });
  if (existing) return existing;

  return prisma.exercise.create({
    data: {
      ownerId: null,
      name,
      normalizedName,
      muscleGroup: MuscleGroup.CHEST,
      category: ExerciseCategory.MACHINE,
      defaultUnit: LoadUnit.KG,
    },
    select: { id: true, name: true, defaultUnit: true },
  });
}

export async function createVariantFor(
  userId: string,
  exerciseId: string,
  label: string,
  unit: LoadUnit = LoadUnit.KG,
) {
  return prisma.exerciseVariant.create({
    data: { userId, exerciseId, label, unit, weightIncrement: unit === LoadUnit.LEVEL ? 1 : 2.5 },
    select: { id: true, label: true, unit: true },
  });
}
