import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LoadUnit, PersonalRecordType, WorkoutStatus } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import {
  addSet,
  addWorkoutExercise,
  copyLastSessionSets,
  deleteSet,
  finishWorkout,
  getActiveWorkout,
  getWorkout,
  startWorkout,
  updateSet,
} from "@/server/services/workout.service";
import {
  createTestUser,
  createVariantFor,
  deleteTestUsers,
  ensureCatalogExercise,
} from "./helpers/factories";

let userId: string;
let otherUserId: string;
let exerciseId: string;
let variantId: string;

beforeAll(async () => {
  const [user, other, exercise] = await Promise.all([
    createTestUser("Titulaire"),
    createTestUser("Intrus"),
    ensureCatalogExercise("Chest Press"),
  ]);
  userId = user.id;
  otherUserId = other.id;
  exerciseId = exercise.id;
  variantId = (await createVariantFor(userId, exerciseId, "Matrix")).id;
});

afterAll(async () => {
  await deleteTestUsers(userId, otherUserId);
  await prisma.$disconnect();
});

/** Démarre une séance propre en fermant celle qui traînerait. */
async function freshWorkout(name: string) {
  const active = await getActiveWorkout(userId);
  if (active) {
    await finishWorkout(userId, active.id, { discardIncompleteSets: true, notes: null });
  }
  return startWorkout(userId, { name });
}

describe("cycle de vie d'une séance", () => {
  it("interdit deux séances en cours simultanées", async () => {
    await freshWorkout("Première");
    await expect(startWorkout(userId, { name: "Deuxième" })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("calcule le volume à partir des seules séries validées", async () => {
    const workout = await freshWorkout("Push");
    const withExercise = await addWorkoutExercise(userId, workout.id, { exerciseId, variantId });
    const entryId = withExercise.exercises[0]!.id;

    await addSet(userId, entryId, { weight: 60, reps: 10 });
    await addSet(userId, entryId, { weight: 60, reps: 10, isCompleted: false });
    const afterWarmup = await addSet(userId, entryId, { weight: 40, reps: 15, isWarmup: true });

    // 60 x 10 uniquement : la série non validée et l'échauffement sont exclus.
    expect(afterWarmup.totalVolumeKg).toBe(600);
    expect(afterWarmup.totalSets).toBe(1);
  });

  it("renumérote les séries après une suppression", async () => {
    const workout = await freshWorkout("Renumérotation");
    const withExercise = await addWorkoutExercise(userId, workout.id, { exerciseId });
    const entryId = withExercise.exercises[0]!.id;

    await addSet(userId, entryId, { weight: 50, reps: 10 });
    const second = await addSet(userId, entryId, { weight: 55, reps: 9 });
    await addSet(userId, entryId, { weight: 60, reps: 8 });

    const middleSetId = second.exercises[0]!.sets[1]!.id;
    const afterDelete = await deleteSet(userId, middleSetId);

    const sets = afterDelete.exercises[0]!.sets;
    expect(sets.map((set) => set.setNumber)).toEqual([1, 2]);
    expect(sets.map((set) => set.weight)).toEqual([50, 60]);
  });

  it("refuse une série sans aucune mesure", async () => {
    const workout = await freshWorkout("Série vide");
    const withExercise = await addWorkoutExercise(userId, workout.id, { exerciseId });
    await expect(
      addSet(userId, withExercise.exercises[0]!.id, {}),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("clôture la séance en supprimant les séries non validées", async () => {
    const workout = await freshWorkout("Clôture");
    const withExercise = await addWorkoutExercise(userId, workout.id, { exerciseId, variantId });
    const entryId = withExercise.exercises[0]!.id;

    await addSet(userId, entryId, { weight: 70, reps: 8 });
    await addSet(userId, entryId, { weight: 70, reps: 8, isCompleted: false });

    const finished = await finishWorkout(userId, workout.id, {
      discardIncompleteSets: true,
      notes: "Séance test",
    });

    expect(finished.status).toBe(WorkoutStatus.COMPLETED);
    expect(finished.finishedAt).not.toBeNull();
    expect(finished.durationSeconds).not.toBeNull();
    expect(finished.exercises[0]!.sets).toHaveLength(1);
    expect(await getActiveWorkout(userId)).toBeNull();
  });
});

describe("dernière performance et recopie", () => {
  it("propose la séance précédente et la recopie comme séries à valider", async () => {
    // Une séance de référence, terminée.
    const reference = await freshWorkout("Référence");
    const referenceExercise = await addWorkoutExercise(userId, reference.id, {
      exerciseId,
      variantId,
    });
    const referenceEntryId = referenceExercise.exercises[0]!.id;
    await addSet(userId, referenceEntryId, { weight: 65, reps: 10 });
    await addSet(userId, referenceEntryId, { weight: 65, reps: 9 });
    await finishWorkout(userId, reference.id, { discardIncompleteSets: true, notes: null });

    // La séance suivante doit voir cette performance.
    const next = await freshWorkout("Suivante");
    const nextExercise = await addWorkoutExercise(userId, next.id, { exerciseId, variantId });
    const entry = nextExercise.exercises[0]!;

    expect(entry.lastPerformance).not.toBeNull();
    expect(entry.lastPerformance?.summary).toBe("65 kg × 10 reps · 65 kg × 9 reps");

    const copied = await copyLastSessionSets(userId, entry.id);
    const sets = copied.exercises[0]!.sets;
    expect(sets).toHaveLength(2);
    expect(sets.map((set) => set.reps)).toEqual([10, 9]);
    // Recopiées comme proposition, à valider une fois réellement effectuées.
    expect(sets.every((set) => set.isCompleted === false)).toBe(true);
    expect(copied.totalVolumeKg).toBe(0);
  });
});

describe("records personnels", () => {
  it("suit la meilleure performance et redescend après correction", async () => {
    const workout = await freshWorkout("Records");
    const withExercise = await addWorkoutExercise(userId, workout.id, { exerciseId, variantId });
    const entryId = withExercise.exercises[0]!.id;

    const afterHeavy = await addSet(userId, entryId, { weight: 100, reps: 5 });
    const heavySetId = afterHeavy.exercises[0]!.sets[0]!.id;

    const maxWeight = await prisma.personalRecord.findFirst({
      where: { userId, exerciseId, variantId, type: PersonalRecordType.MAX_WEIGHT },
      select: { value: true },
    });
    expect(maxWeight?.value.toNumber()).toBe(100);

    // Correction : la charge était en réalité plus basse.
    await updateSet(userId, heavySetId, { weight: 80 });

    const corrected = await prisma.personalRecord.findFirst({
      where: { userId, exerciseId, variantId, type: PersonalRecordType.MAX_WEIGHT },
      select: { value: true },
    });
    expect(corrected?.value.toNumber()).toBe(80);
  });

  it("sépare les records de deux machines différentes", async () => {
    const technogymId = (
      await createVariantFor(userId, exerciseId, "Technogym", LoadUnit.LEVEL)
    ).id;

    const workout = await freshWorkout("Deux machines");
    const withExercise = await addWorkoutExercise(userId, workout.id, {
      exerciseId,
      variantId: technogymId,
    });

    const entry = withExercise.exercises[0]!;
    // L'unité de la machine l'emporte sur celle de l'exercice.
    expect(entry.resolvedUnit).toBe(LoadUnit.LEVEL);

    const afterSet = await addSet(userId, entry.id, { weight: 8, reps: 12 });
    const set = afterSet.exercises[0]!.sets[0]!;

    // Un niveau de machine n'est jamais converti en kilos ni compté en volume.
    expect(set.weightUnit).toBe(LoadUnit.LEVEL);
    expect(set.weightKg).toBeNull();
    expect(afterSet.totalVolumeKg).toBe(0);

    const levelRecord = await prisma.personalRecord.findFirst({
      where: { userId, exerciseId, variantId: technogymId, type: PersonalRecordType.MAX_WEIGHT },
      select: { value: true },
    });
    expect(levelRecord?.value.toNumber()).toBe(8);
  });
});

describe("isolation entre utilisateurs", () => {
  it("empêche de lire la séance d'un autre compte", async () => {
    const workout = await freshWorkout("Privée");
    await expect(getWorkout(otherUserId, workout.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("empêche de modifier les séries d'un autre compte", async () => {
    const workout = await freshWorkout("Privée bis");
    const withExercise = await addWorkoutExercise(userId, workout.id, { exerciseId });
    const entryId = withExercise.exercises[0]!.id;
    const withSet = await addSet(userId, entryId, { weight: 50, reps: 10 });
    const setId = withSet.exercises[0]!.sets[0]!.id;

    await expect(addSet(otherUserId, entryId, { weight: 999, reps: 1 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(updateSet(otherUserId, setId, { reps: 99 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(deleteSet(otherUserId, setId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("n'expose pas la machine d'un autre compte", async () => {
    const workout = await startWorkout(otherUserId, { name: "Chez l'autre" });
    await expect(
      addWorkoutExercise(otherUserId, workout.id, { exerciseId, variantId }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
