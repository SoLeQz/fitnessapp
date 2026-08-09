import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { LoadUnit, WorkoutStatus } from "../src/generated/prisma/enums";
import { normalizeName } from "../src/lib/text";
import { toKilograms } from "../src/lib/load-unit";
import {
  recalculateWorkoutTotals,
  refreshPersonalRecords,
  type ExerciseScope,
} from "../src/server/services/workout-stats.service";
import { EXERCISE_CATALOG } from "./exercise-catalog";

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) throw new Error("DATABASE_URL est requis pour exécuter le seed.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/**
 * Alimente le catalogue commun. Idempotent : relancer le seed met à jour les
 * exercices existants sans dupliquer ni toucher aux exercices personnels.
 */
async function seedCatalog(): Promise<void> {
  let created = 0;
  let updated = 0;

  for (const entry of EXERCISE_CATALOG) {
    const normalized = normalizeName(entry.name);
    const existing = await prisma.exercise.findFirst({
      where: { ownerId: null, normalizedName: normalized },
      select: { id: true },
    });

    const data = {
      name: entry.name,
      normalizedName: normalized,
      muscleGroup: entry.muscleGroup,
      secondaryMuscles: entry.secondaryMuscles,
      category: entry.category,
      trackingMode: entry.trackingMode,
      defaultUnit: entry.defaultUnit,
      description: entry.description,
    };

    if (existing) {
      await prisma.exercise.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.exercise.create({ data: { ...data, ownerId: null } });
      created += 1;
    }
  }

  console.info(`Catalogue : ${created} exercice(s) créé(s), ${updated} mis à jour.`);
}

// ---------------------------------------------------------------------------
// Données de démonstration (activées par SEED_DEMO=1)
// ---------------------------------------------------------------------------

const DEMO_EMAIL = "demo@forgefit.local";
const DEMO_PASSWORD = "ForgeFitDemo2026";

/** Composition d'un jour de programme : exercice, séries cibles, charge de départ. */
interface DemoSlot {
  exercise: string;
  sets: number;
  repsRange: [number, number];
  startWeight: number;
  /** Progression appliquée toutes les deux semaines. */
  weeklyStep: number;
  rest: number;
}

const DEMO_DAYS: { name: string; slots: DemoSlot[] }[] = [
  {
    name: "Push",
    slots: [
      { exercise: "Chest Press", sets: 3, repsRange: [8, 12], startWeight: 50, weeklyStep: 2.5, rest: 90 },
      { exercise: "Shoulder Press", sets: 3, repsRange: [8, 12], startWeight: 30, weeklyStep: 2.5, rest: 90 },
      { exercise: "Lateral Raise", sets: 4, repsRange: [12, 15], startWeight: 8, weeklyStep: 1, rest: 60 },
      { exercise: "Triceps Pushdown", sets: 3, repsRange: [10, 14], startWeight: 25, weeklyStep: 2.5, rest: 60 },
    ],
  },
  {
    name: "Pull",
    slots: [
      { exercise: "Lat Pulldown", sets: 3, repsRange: [8, 12], startWeight: 45, weeklyStep: 2.5, rest: 90 },
      { exercise: "Seated Row", sets: 3, repsRange: [8, 12], startWeight: 50, weeklyStep: 2.5, rest: 90 },
      { exercise: "Face Pull", sets: 3, repsRange: [12, 15], startWeight: 20, weeklyStep: 1.25, rest: 60 },
      { exercise: "Biceps Curl", sets: 3, repsRange: [10, 12], startWeight: 12, weeklyStep: 1, rest: 60 },
    ],
  },
  {
    name: "Legs",
    slots: [
      { exercise: "Leg Press", sets: 4, repsRange: [8, 12], startWeight: 120, weeklyStep: 5, rest: 120 },
      { exercise: "Leg Extension", sets: 3, repsRange: [10, 14], startWeight: 40, weeklyStep: 2.5, rest: 75 },
      { exercise: "Leg Curl", sets: 3, repsRange: [10, 14], startWeight: 35, weeklyStep: 2.5, rest: 75 },
      { exercise: "Calf Raise", sets: 4, repsRange: [12, 18], startWeight: 60, weeklyStep: 2.5, rest: 60 },
    ],
  },
];

const DEMO_WEEKS = 8;

/** Générateur pseudo-aléatoire déterministe : le seed produit toujours les mêmes données. */
function makeRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

async function seedDemoUser(): Promise<void> {
  const random = makeRandom(20260809);

  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      displayName: "Nicolas",
      preferredUnit: LoadUnit.KG,
      defaultRestSeconds: 90,
    },
    select: { id: true },
  });

  const catalog = await prisma.exercise.findMany({
    where: { ownerId: null },
    select: { id: true, name: true, defaultUnit: true },
  });
  const exerciseByName = new Map(catalog.map((exercise) => [exercise.name, exercise]));

  const resolve = (name: string) => {
    const exercise = exerciseByName.get(name);
    if (!exercise) throw new Error(`Exercice « ${name} » absent du catalogue.`);
    return exercise;
  };

  // Deux machines différentes pour le même mouvement : c'est le cas d'usage
  // qui justifie la table `exercise_variants`.
  const chestPress = resolve("Chest Press");
  const matrixVariant = await prisma.exerciseVariant.create({
    data: {
      userId: user.id,
      exerciseId: chestPress.id,
      label: "Matrix",
      unit: LoadUnit.KG,
      weightIncrement: 2.5,
      isDefault: true,
      notes: "Machine principale de la salle.",
    },
    select: { id: true },
  });
  await prisma.exerciseVariant.create({
    data: {
      userId: user.id,
      exerciseId: chestPress.id,
      label: "Technogym",
      unit: LoadUnit.LEVEL,
      weightIncrement: 1,
      notes: "Machine graduée en niveaux, non comparable aux kilos.",
    },
  });

  const program = await prisma.workoutProgram.create({
    data: {
      userId: user.id,
      name: "Push Pull Legs",
      description: "Rotation sur trois jours, trois séances par semaine.",
      days: {
        create: DEMO_DAYS.map((day, dayIndex) => ({
          name: day.name,
          position: dayIndex,
          exercises: {
            create: day.slots.map((slot, slotIndex) => ({
              exerciseId: resolve(slot.exercise).id,
              variantId: slot.exercise === "Chest Press" ? matrixVariant.id : null,
              position: slotIndex,
              targetSets: slot.sets,
              targetRepsMin: slot.repsRange[0],
              targetRepsMax: slot.repsRange[1],
              targetRestSeconds: slot.rest,
            })),
          },
        })),
      },
    },
    select: { id: true, days: { select: { id: true, name: true }, orderBy: { position: "asc" } } },
  });

  const touchedScopes = new Map<string, ExerciseScope>();
  let workoutCount = 0;

  for (let week = 0; week < DEMO_WEEKS; week += 1) {
    for (let dayIndex = 0; dayIndex < DEMO_DAYS.length; dayIndex += 1) {
      const day = DEMO_DAYS[dayIndex];
      const programDay = program.days[dayIndex];
      if (!day || !programDay) continue;

      // Semaines passées : lundi / mercredi / vendredi, séance de 19 h.
      const weeksAgo = DEMO_WEEKS - week;
      const startedAt = new Date();
      startedAt.setHours(19, 0, 0, 0);
      startedAt.setDate(startedAt.getDate() - weeksAgo * 7 + dayIndex * 2);

      const durationMinutes = 55 + Math.round(random() * 20);
      const finishedAt = new Date(startedAt.getTime() + durationMinutes * 60_000);

      const workout = await prisma.workout.create({
        data: {
          userId: user.id,
          programDayId: programDay.id,
          name: day.name,
          status: WorkoutStatus.COMPLETED,
          startedAt,
          finishedAt,
          exercises: {
            create: day.slots.map((slot, slotIndex) => {
              const exercise = resolve(slot.exercise);
              const isChestPress = slot.exercise === "Chest Press";
              const unit = isChestPress ? LoadUnit.KG : exercise.defaultUnit;

              // Palier de charge toutes les deux semaines, avec une série
              // dégressive en fin d'exercice : allure réaliste d'une progression.
              const weight = slot.startWeight + Math.floor(week / 2) * slot.weeklyStep;
              const [minReps, maxReps] = slot.repsRange;

              return {
                exerciseId: exercise.id,
                variantId: isChestPress ? matrixVariant.id : null,
                position: slotIndex,
                sets: {
                  create: Array.from({ length: slot.sets }, (_, setIndex) => {
                    const fatigue = Math.floor(setIndex * ((maxReps - minReps) / slot.sets));
                    const reps = Math.max(minReps, maxReps - fatigue - (random() < 0.3 ? 1 : 0));
                    return {
                      setNumber: setIndex + 1,
                      weight,
                      weightUnit: unit,
                      weightKg: toKilograms(weight, unit),
                      reps,
                      restSeconds: slot.rest,
                      isCompleted: true,
                      completedAt: new Date(startedAt.getTime() + (slotIndex * 8 + setIndex * 2) * 60_000),
                    };
                  }),
                },
              };
            }),
          },
        },
        select: { id: true, exercises: { select: { exerciseId: true, variantId: true } } },
      });

      for (const exercise of workout.exercises) {
        touchedScopes.set(`${exercise.exerciseId}:${exercise.variantId ?? ""}`, {
          exerciseId: exercise.exerciseId,
          variantId: exercise.variantId,
        });
      }

      await recalculateWorkoutTotals(prisma, workout.id);
      workoutCount += 1;
    }
  }

  await refreshPersonalRecords(prisma, user.id, [...touchedScopes.values()]);

  // Suivi du poids corporel : une pesée par semaine, légère tendance à la hausse.
  const bodyWeightEntries = Array.from({ length: DEMO_WEEKS + 1 }, (_, index) => {
    const measuredOn = new Date();
    measuredOn.setHours(0, 0, 0, 0);
    measuredOn.setDate(measuredOn.getDate() - (DEMO_WEEKS - index) * 7);
    return {
      userId: user.id,
      measuredOn,
      unit: LoadUnit.KG,
      weightKg: Math.round((74 + index * 0.2 + (random() - 0.5)) * 10) / 10,
    };
  });
  await prisma.bodyWeightEntry.createMany({ data: bodyWeightEntries });

  console.info(
    `Démo : compte ${DEMO_EMAIL} (mot de passe « ${DEMO_PASSWORD} »), ` +
      `${workoutCount} séances, ${bodyWeightEntries.length} pesées.`,
  );
}

async function main(): Promise<void> {
  await seedCatalog();
  if (process.env["SEED_DEMO"] === "1") {
    await seedDemoUser();
  } else {
    console.info("Données de démonstration ignorées (SEED_DEMO=1 pour les générer).");
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
