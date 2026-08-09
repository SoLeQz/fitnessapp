import type { Prisma } from "@/generated/prisma/client";
import type { LoadUnit } from "@/generated/prisma/enums";
import { WorkoutStatus } from "@/generated/prisma/enums";
import { toKilograms } from "@/lib/load-unit";
import { prisma } from "@/server/db";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import { decimalToNumber, type Db } from "@/server/prisma-utils";
import {
  recalculateWorkoutTotals,
  refreshPersonalRecords,
  type ExerciseScope,
} from "./workout-stats.service";
import {
  resolveIncrement,
  resolveUnit,
  summarizeSets,
  toSetView,
  WORKOUT_SET_SELECT,
  type LastPerformanceView,
  type WorkoutExerciseView,
  type WorkoutView,
} from "./workout-view";
import type {
  AddWorkoutExerciseInput,
  FinishWorkoutInput,
  SetInput,
  StartWorkoutInput,
  UpdateSetInput,
  UpdateWorkoutExerciseInput,
  UpdateWorkoutInput,
  WorkoutListFilters,
} from "@/server/validation/workout";

const WORKOUT_INCLUDE = {
  programDay: { select: { id: true, name: true, program: { select: { name: true } } } },
  exercises: {
    orderBy: { position: "asc" },
    select: {
      id: true,
      position: true,
      notes: true,
      exercise: {
        select: {
          id: true,
          name: true,
          muscleGroup: true,
          category: true,
          trackingMode: true,
          defaultUnit: true,
        },
      },
      variant: { select: { id: true, label: true, unit: true, weightIncrement: true } },
      sets: { orderBy: { setNumber: "asc" }, select: WORKOUT_SET_SELECT },
    },
  },
} as const satisfies Prisma.WorkoutInclude;

type StoredWorkout = Prisma.WorkoutGetPayload<{ include: typeof WORKOUT_INCLUDE }>;

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

/**
 * Dernière performance connue pour un couple (exercice, machine), hors séance
 * en cours. C'est l'information affichée pendant la séance pour savoir quelle
 * charge reprendre.
 */
export async function getLastPerformance(
  userId: string,
  exerciseId: string,
  variantId: string | null,
  excludeWorkoutId?: string,
): Promise<LastPerformanceView | null> {
  const previous = await prisma.workoutExercise.findFirst({
    where: {
      exerciseId,
      variantId,
      workout: {
        userId,
        status: WorkoutStatus.COMPLETED,
        ...(excludeWorkoutId ? { id: { not: excludeWorkoutId } } : {}),
      },
      sets: { some: { isCompleted: true, isWarmup: false } },
    },
    orderBy: { workout: { startedAt: "desc" } },
    select: {
      workoutId: true,
      workout: { select: { startedAt: true } },
      sets: {
        where: { isCompleted: true, isWarmup: false },
        orderBy: { setNumber: "asc" },
        select: { weight: true, weightUnit: true, reps: true },
      },
    },
  });

  if (!previous) return null;

  const sets = previous.sets.map((set) => ({
    weight: decimalToNumber(set.weight),
    weightUnit: set.weightUnit,
    reps: set.reps,
  }));

  return {
    workoutId: previous.workoutId,
    performedAt: previous.workout.startedAt,
    sets,
    summary: summarizeSets(sets),
  };
}

async function toWorkoutView(userId: string, workout: StoredWorkout): Promise<WorkoutView> {
  // Machines disponibles pour les exercices de la séance, en une seule requête.
  const variantRows = await prisma.exerciseVariant.findMany({
    where: {
      userId,
      isArchived: false,
      exerciseId: { in: workout.exercises.map((entry) => entry.exercise.id) },
    },
    orderBy: [{ isDefault: "desc" }, { label: "asc" }],
    select: { id: true, label: true, unit: true, exerciseId: true },
  });

  const variantsByExercise = new Map<string, { id: string; label: string; unit: LoadUnit }[]>();
  for (const { exerciseId, ...variant } of variantRows) {
    const bucket = variantsByExercise.get(exerciseId);
    if (bucket) bucket.push(variant);
    else variantsByExercise.set(exerciseId, [variant]);
  }

  const exercises: WorkoutExerciseView[] = await Promise.all(
    workout.exercises.map(async (entry) => {
      const unit = resolveUnit(entry.exercise.defaultUnit, entry.variant?.unit);
      return {
        id: entry.id,
        position: entry.position,
        notes: entry.notes,
        exercise: entry.exercise,
        variant: entry.variant
          ? { id: entry.variant.id, label: entry.variant.label, unit: entry.variant.unit }
          : null,
        availableVariants: variantsByExercise.get(entry.exercise.id) ?? [],
        resolvedUnit: unit,
        weightIncrement: resolveIncrement(
          unit,
          entry.variant ? decimalToNumber(entry.variant.weightIncrement) : null,
        ),
        sets: entry.sets.map(toSetView),
        lastPerformance: await getLastPerformance(
          userId,
          entry.exercise.id,
          entry.variant?.id ?? null,
          workout.id,
        ),
      };
    }),
  );

  return {
    id: workout.id,
    name: workout.name,
    status: workout.status,
    startedAt: workout.startedAt,
    finishedAt: workout.finishedAt,
    notes: workout.notes,
    totalVolumeKg: decimalToNumber(workout.totalVolumeKg) ?? 0,
    totalSets: workout.totalSets,
    durationSeconds: workout.durationSeconds,
    programDay: workout.programDay
      ? {
          id: workout.programDay.id,
          name: workout.programDay.name,
          programName: workout.programDay.program.name,
        }
      : null,
    exercises,
  };
}

export async function getWorkout(userId: string, workoutId: string): Promise<WorkoutView> {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, userId },
    include: WORKOUT_INCLUDE,
  });
  if (!workout) throw new NotFoundError("Séance introuvable.");
  return toWorkoutView(userId, workout);
}

/** Séance en cours, s'il y en a une. Une seule est possible (index partiel). */
export async function getActiveWorkout(userId: string): Promise<WorkoutView | null> {
  const workout = await prisma.workout.findFirst({
    where: { userId, status: WorkoutStatus.IN_PROGRESS },
    include: WORKOUT_INCLUDE,
  });
  return workout ? toWorkoutView(userId, workout) : null;
}

export interface WorkoutListItem {
  id: string;
  name: string;
  status: WorkoutStatus;
  startedAt: Date;
  finishedAt: Date | null;
  durationSeconds: number | null;
  totalVolumeKg: number;
  totalSets: number;
  exerciseCount: number;
  exerciseNames: string[];
}

export async function listWorkouts(
  userId: string,
  filters: Partial<WorkoutListFilters> = {},
): Promise<WorkoutListItem[]> {
  const workouts = await prisma.workout.findMany({
    where: {
      userId,
      status: { not: WorkoutStatus.ABANDONED },
      ...(filters.from || filters.to
        ? {
            startedAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    },
    orderBy: { startedAt: "desc" },
    take: filters.limit ?? 30,
    select: {
      id: true,
      name: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      durationSeconds: true,
      totalVolumeKg: true,
      totalSets: true,
      exercises: {
        orderBy: { position: "asc" },
        select: { exercise: { select: { name: true } } },
      },
    },
  });

  return workouts.map(({ exercises, totalVolumeKg, ...workout }) => ({
    ...workout,
    totalVolumeKg: decimalToNumber(totalVolumeKg) ?? 0,
    exerciseCount: exercises.length,
    exerciseNames: exercises.map((entry) => entry.exercise.name),
  }));
}

// ---------------------------------------------------------------------------
// Cycle de vie d'une séance
// ---------------------------------------------------------------------------

/** Vérifie que l'exercice est visible par l'utilisateur avant de l'ajouter. */
async function assertExerciseUsable(
  db: Db,
  userId: string,
  exerciseId: string,
  variantId: string | null,
): Promise<void> {
  const exercise = await db.exercise.findFirst({
    where: { id: exerciseId, OR: [{ ownerId: null }, { ownerId: userId }] },
    select: { id: true },
  });
  if (!exercise) throw new NotFoundError("Exercice introuvable.");

  if (variantId) {
    const variant = await db.exerciseVariant.findFirst({
      where: { id: variantId, userId, exerciseId },
      select: { id: true },
    });
    if (!variant) throw new NotFoundError("Machine introuvable pour cet exercice.");
  }
}

export async function startWorkout(
  userId: string,
  input: StartWorkoutInput,
): Promise<WorkoutView> {
  const existing = await prisma.workout.findFirst({
    where: { userId, status: WorkoutStatus.IN_PROGRESS },
    select: { id: true },
  });
  if (existing) {
    throw new ConflictError("Une séance est déjà en cours. Terminez-la avant d'en démarrer une autre.");
  }

  // Exercices issus du jour de programme, s'il y en a un.
  let plannedExercises: { exerciseId: string; variantId: string | null }[] = [];
  let name = input.name;

  if (input.programDayId) {
    const day = await prisma.programDay.findFirst({
      where: { id: input.programDayId, program: { userId } },
      select: {
        name: true,
        exercises: {
          orderBy: { position: "asc" },
          select: { exerciseId: true, variantId: true },
        },
      },
    });
    if (!day) throw new NotFoundError("Jour de programme introuvable.");
    plannedExercises = day.exercises;
    name ??= day.name;
  }

  if (input.exerciseIds?.length) {
    for (const exerciseId of input.exerciseIds) {
      await assertExerciseUsable(prisma, userId, exerciseId, null);
      plannedExercises.push({ exerciseId, variantId: null });
    }
  }

  const workout = await prisma.workout.create({
    data: {
      userId,
      name: name ?? "Séance libre",
      programDayId: input.programDayId ?? null,
      status: WorkoutStatus.IN_PROGRESS,
      exercises: {
        create: plannedExercises.map((entry, index) => ({
          exerciseId: entry.exerciseId,
          variantId: entry.variantId,
          position: index,
        })),
      },
    },
    select: { id: true },
  });

  return getWorkout(userId, workout.id);
}

async function requireEditableWorkout(
  userId: string,
  workoutId: string,
): Promise<{ id: string; status: WorkoutStatus }> {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, userId },
    select: { id: true, status: true },
  });
  if (!workout) throw new NotFoundError("Séance introuvable.");
  return workout;
}

export async function updateWorkout(
  userId: string,
  workoutId: string,
  input: UpdateWorkoutInput,
): Promise<WorkoutView> {
  await requireEditableWorkout(userId, workoutId);
  await prisma.workout.update({
    where: { id: workoutId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
    },
  });
  return getWorkout(userId, workoutId);
}

/**
 * Clôture la séance. Les séries laissées non validées sont supprimées par
 * défaut : une ligne saisie puis abandonnée ne doit pas polluer l'historique.
 */
export async function finishWorkout(
  userId: string,
  workoutId: string,
  input: FinishWorkoutInput,
): Promise<WorkoutView> {
  const workout = await requireEditableWorkout(userId, workoutId);
  if (workout.status !== WorkoutStatus.IN_PROGRESS) {
    throw new ConflictError("Cette séance est déjà terminée.");
  }

  const scopes = await scopesOfWorkout(prisma, workoutId);

  await prisma.$transaction(async (tx) => {
    if (input.discardIncompleteSets) {
      await tx.workoutSet.deleteMany({
        where: { workoutExercise: { workoutId }, isCompleted: false },
      });
    }

    // Un exercice ouvert mais sans aucune série n'a pas eu lieu.
    await tx.workoutExercise.deleteMany({
      where: { workoutId, sets: { none: {} } },
    });

    await tx.workout.update({
      where: { id: workoutId },
      data: {
        status: WorkoutStatus.COMPLETED,
        finishedAt: new Date(),
        ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      },
    });

    await recalculateWorkoutTotals(tx, workoutId);
    await refreshPersonalRecords(tx, userId, scopes);
  });

  return getWorkout(userId, workoutId);
}

export async function abandonWorkout(userId: string, workoutId: string): Promise<void> {
  const workout = await requireEditableWorkout(userId, workoutId);
  if (workout.status !== WorkoutStatus.IN_PROGRESS) {
    throw new ConflictError("Cette séance n'est plus en cours.");
  }

  const scopes = await scopesOfWorkout(prisma, workoutId);

  await prisma.$transaction(async (tx) => {
    await tx.workout.update({
      where: { id: workoutId },
      data: { status: WorkoutStatus.ABANDONED, finishedAt: new Date() },
    });
    // Une séance abandonnée sort des records : ils sont recalculés sans elle.
    await refreshPersonalRecords(tx, userId, scopes);
  });
}

export async function deleteWorkout(userId: string, workoutId: string): Promise<void> {
  await requireEditableWorkout(userId, workoutId);
  const scopes = await scopesOfWorkout(prisma, workoutId);

  await prisma.$transaction(async (tx) => {
    await tx.workout.delete({ where: { id: workoutId } });
    await refreshPersonalRecords(tx, userId, scopes);
  });
}

/** Couples (exercice, machine) touchés par une séance : périmètre du recalcul. */
async function scopesOfWorkout(db: Db, workoutId: string): Promise<ExerciseScope[]> {
  const rows = await db.workoutExercise.findMany({
    where: { workoutId },
    select: { exerciseId: true, variantId: true },
  });

  const unique = new Map<string, ExerciseScope>();
  for (const row of rows) {
    unique.set(`${row.exerciseId}:${row.variantId ?? ""}`, {
      exerciseId: row.exerciseId,
      variantId: row.variantId,
    });
  }
  return [...unique.values()];
}

// ---------------------------------------------------------------------------
// Exercices d'une séance
// ---------------------------------------------------------------------------

export async function addWorkoutExercise(
  userId: string,
  workoutId: string,
  input: AddWorkoutExerciseInput,
): Promise<WorkoutView> {
  await requireEditableWorkout(userId, workoutId);
  await assertExerciseUsable(prisma, userId, input.exerciseId, input.variantId ?? null);

  const last = await prisma.workoutExercise.findFirst({
    where: { workoutId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.workoutExercise.create({
    data: {
      workoutId,
      exerciseId: input.exerciseId,
      variantId: input.variantId ?? null,
      position: (last?.position ?? -1) + 1,
    },
  });

  return getWorkout(userId, workoutId);
}

async function requireWorkoutExercise(
  userId: string,
  workoutExerciseId: string,
): Promise<{ id: string; workoutId: string; exerciseId: string; variantId: string | null }> {
  const entry = await prisma.workoutExercise.findFirst({
    where: { id: workoutExerciseId, workout: { userId } },
    select: { id: true, workoutId: true, exerciseId: true, variantId: true },
  });
  if (!entry) throw new NotFoundError("Exercice de séance introuvable.");
  return entry;
}

export async function updateWorkoutExercise(
  userId: string,
  workoutExerciseId: string,
  input: UpdateWorkoutExerciseInput,
): Promise<WorkoutView> {
  const entry = await requireWorkoutExercise(userId, workoutExerciseId);

  if (input.variantId !== undefined && input.variantId !== null) {
    await assertExerciseUsable(prisma, userId, entry.exerciseId, input.variantId);
  }

  await prisma.workoutExercise.update({
    where: { id: entry.id },
    data: {
      ...(input.variantId !== undefined ? { variantId: input.variantId } : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
    },
  });

  // Changer de machine change l'unité : les séries déjà saisies deviendraient
  // incohérentes, elles sont donc réalignées sur la nouvelle unité.
  if (input.variantId !== undefined) {
    await realignSetUnits(entry.id);
    await prisma.$transaction(async (tx) => {
      await recalculateWorkoutTotals(tx, entry.workoutId);
      await refreshPersonalRecords(tx, userId, [
        { exerciseId: entry.exerciseId, variantId: entry.variantId },
        { exerciseId: entry.exerciseId, variantId: input.variantId ?? null },
      ]);
    });
  }

  return getWorkout(userId, entry.workoutId);
}

/** Réécrit l'unité et l'équivalent en kilos des séries d'un exercice de séance. */
async function realignSetUnits(workoutExerciseId: string): Promise<void> {
  const entry = await prisma.workoutExercise.findUnique({
    where: { id: workoutExerciseId },
    select: {
      exercise: { select: { defaultUnit: true } },
      variant: { select: { unit: true } },
      sets: { select: { id: true, weight: true } },
    },
  });
  if (!entry) return;

  const unit = resolveUnit(entry.exercise.defaultUnit, entry.variant?.unit);
  await prisma.$transaction(
    entry.sets.map((set) => {
      const weight = decimalToNumber(set.weight);
      return prisma.workoutSet.update({
        where: { id: set.id },
        data: { weightUnit: unit, weightKg: toKilograms(weight, unit) },
      });
    }),
  );
}

export async function removeWorkoutExercise(
  userId: string,
  workoutExerciseId: string,
): Promise<WorkoutView> {
  const entry = await requireWorkoutExercise(userId, workoutExerciseId);

  await prisma.$transaction(async (tx) => {
    await tx.workoutExercise.delete({ where: { id: entry.id } });
    await recalculateWorkoutTotals(tx, entry.workoutId);
    await refreshPersonalRecords(tx, userId, [
      { exerciseId: entry.exerciseId, variantId: entry.variantId },
    ]);
  });

  return getWorkout(userId, entry.workoutId);
}

/** Réordonne les exercices d'une séance selon la liste d'identifiants fournie. */
export async function reorderWorkoutExercises(
  userId: string,
  workoutId: string,
  orderedIds: string[],
): Promise<WorkoutView> {
  await requireEditableWorkout(userId, workoutId);

  const owned = await prisma.workoutExercise.findMany({
    where: { workoutId },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((entry) => entry.id));
  if (orderedIds.length !== ownedIds.size || orderedIds.some((id) => !ownedIds.has(id))) {
    throw new ValidationError("La liste d'ordre ne correspond pas aux exercices de la séance.");
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.workoutExercise.update({ where: { id }, data: { position: index } }),
    ),
  );

  return getWorkout(userId, workoutId);
}

// ---------------------------------------------------------------------------
// Séries
// ---------------------------------------------------------------------------

/** Une série doit porter au moins une mesure : sinon elle n'apprend rien. */
function assertMeaningfulSet(input: SetInput): void {
  const hasMeasure =
    (input.weight ?? null) !== null ||
    (input.reps ?? null) !== null ||
    (input.durationSeconds ?? null) !== null ||
    (input.distanceMeters ?? null) !== null;
  if (!hasMeasure) {
    throw new ValidationError("Renseignez au moins une charge, des répétitions, une durée ou une distance.");
  }
}

export async function addSet(
  userId: string,
  workoutExerciseId: string,
  input: SetInput,
): Promise<WorkoutView> {
  assertMeaningfulSet(input);
  const entry = await requireWorkoutExercise(userId, workoutExerciseId);

  const context = await prisma.workoutExercise.findUnique({
    where: { id: entry.id },
    select: {
      exercise: { select: { defaultUnit: true } },
      variant: { select: { unit: true } },
      sets: { orderBy: { setNumber: "desc" }, take: 1, select: { setNumber: true } },
    },
  });
  if (!context) throw new NotFoundError("Exercice de séance introuvable.");

  const unit = resolveUnit(context.exercise.defaultUnit, context.variant?.unit);
  const weight = input.weight ?? null;

  await prisma.$transaction(async (tx) => {
    await tx.workoutSet.create({
      data: {
        workoutExerciseId: entry.id,
        setNumber: (context.sets[0]?.setNumber ?? 0) + 1,
        weight,
        weightUnit: unit,
        weightKg: toKilograms(weight, unit),
        reps: input.reps ?? null,
        durationSeconds: input.durationSeconds ?? null,
        distanceMeters: input.distanceMeters ?? null,
        restSeconds: input.restSeconds ?? null,
        rpe: input.rpe ?? null,
        isWarmup: input.isWarmup ?? false,
        isCompleted: input.isCompleted ?? true,
        completedAt: input.isCompleted === false ? null : new Date(),
        notes: input.notes ?? null,
      },
    });

    await recalculateWorkoutTotals(tx, entry.workoutId);
    await refreshPersonalRecords(tx, userId, [
      { exerciseId: entry.exerciseId, variantId: entry.variantId },
    ]);
  });

  return getWorkout(userId, entry.workoutId);
}

export async function updateSet(
  userId: string,
  setId: string,
  input: UpdateSetInput,
): Promise<WorkoutView> {
  const stored = await prisma.workoutSet.findFirst({
    where: { id: setId, workoutExercise: { workout: { userId } } },
    select: {
      id: true,
      weight: true,
      weightUnit: true,
      reps: true,
      durationSeconds: true,
      distanceMeters: true,
      workoutExercise: {
        select: { id: true, workoutId: true, exerciseId: true, variantId: true },
      },
    },
  });
  if (!stored) throw new NotFoundError("Série introuvable.");

  const merged: SetInput = {
    weight: input.weight !== undefined ? input.weight : decimalToNumber(stored.weight),
    reps: input.reps !== undefined ? input.reps : stored.reps,
    durationSeconds:
      input.durationSeconds !== undefined ? input.durationSeconds : stored.durationSeconds,
    distanceMeters:
      input.distanceMeters !== undefined
        ? input.distanceMeters
        : decimalToNumber(stored.distanceMeters),
  };
  assertMeaningfulSet(merged);

  const data: Prisma.WorkoutSetUpdateInput = {};
  if (input.weight !== undefined) {
    data.weight = input.weight;
    // L'unité reste celle figée à la saisie : l'équivalent en kilos suit.
    data.weightKg = toKilograms(input.weight ?? null, stored.weightUnit);
  }
  if (input.reps !== undefined) data.reps = input.reps;
  if (input.durationSeconds !== undefined) data.durationSeconds = input.durationSeconds;
  if (input.distanceMeters !== undefined) data.distanceMeters = input.distanceMeters;
  if (input.restSeconds !== undefined) data.restSeconds = input.restSeconds;
  if (input.rpe !== undefined) data.rpe = input.rpe;
  if (input.isWarmup !== undefined) data.isWarmup = input.isWarmup;
  if (input.notes !== undefined) data.notes = input.notes || null;
  if (input.isCompleted !== undefined) {
    data.isCompleted = input.isCompleted;
    data.completedAt = input.isCompleted ? new Date() : null;
  }

  const entry = stored.workoutExercise;

  await prisma.$transaction(async (tx) => {
    await tx.workoutSet.update({ where: { id: stored.id }, data });
    await recalculateWorkoutTotals(tx, entry.workoutId);
    await refreshPersonalRecords(tx, userId, [
      { exerciseId: entry.exerciseId, variantId: entry.variantId },
    ]);
  });

  return getWorkout(userId, entry.workoutId);
}

export async function deleteSet(userId: string, setId: string): Promise<WorkoutView> {
  const stored = await prisma.workoutSet.findFirst({
    where: { id: setId, workoutExercise: { workout: { userId } } },
    select: {
      id: true,
      workoutExercise: {
        select: { id: true, workoutId: true, exerciseId: true, variantId: true },
      },
    },
  });
  if (!stored) throw new NotFoundError("Série introuvable.");

  const entry = stored.workoutExercise;

  await prisma.$transaction(async (tx) => {
    await tx.workoutSet.delete({ where: { id: stored.id } });

    // Les numéros de série restent consécutifs : la contrainte d'unicité impose
    // de renuméroter, et un trou serait déroutant à la lecture.
    const remaining = await tx.workoutSet.findMany({
      where: { workoutExerciseId: entry.id },
      orderBy: { setNumber: "asc" },
      select: { id: true, setNumber: true },
    });
    // Décalage temporaire hors plage pour ne pas heurter (workoutExerciseId, setNumber).
    for (const [index, set] of remaining.entries()) {
      if (set.setNumber !== index + 1) {
        await tx.workoutSet.update({
          where: { id: set.id },
          data: { setNumber: 1000 + index },
        });
      }
    }
    for (const [index, set] of remaining.entries()) {
      await tx.workoutSet.update({ where: { id: set.id }, data: { setNumber: index + 1 } });
    }

    await recalculateWorkoutTotals(tx, entry.workoutId);
    await refreshPersonalRecords(tx, userId, [
      { exerciseId: entry.exerciseId, variantId: entry.variantId },
    ]);
  });

  return getWorkout(userId, entry.workoutId);
}

/**
 * Recopie la dernière série saisie : le geste le plus fréquent en salle, quand
 * on enchaîne des séries identiques.
 */
export async function repeatLastSet(
  userId: string,
  workoutExerciseId: string,
): Promise<WorkoutView> {
  const entry = await requireWorkoutExercise(userId, workoutExerciseId);

  const last = await prisma.workoutSet.findFirst({
    where: { workoutExerciseId: entry.id },
    orderBy: { setNumber: "desc" },
    select: {
      weight: true,
      reps: true,
      durationSeconds: true,
      distanceMeters: true,
      restSeconds: true,
      isWarmup: true,
    },
  });
  if (!last) throw new ValidationError("Aucune série à recopier.");

  return addSet(userId, entry.id, {
    weight: decimalToNumber(last.weight),
    reps: last.reps,
    durationSeconds: last.durationSeconds,
    distanceMeters: decimalToNumber(last.distanceMeters),
    restSeconds: last.restSeconds,
    isWarmup: last.isWarmup,
  });
}

/**
 * Recopie l'intégralité de la dernière séance pour cet exercice, en remplacement
 * des séries actuelles. Point de départ le plus utile quand on reprend une
 * charge déjà travaillée.
 */
export async function copyLastSessionSets(
  userId: string,
  workoutExerciseId: string,
): Promise<WorkoutView> {
  const entry = await requireWorkoutExercise(userId, workoutExerciseId);

  const performance = await getLastPerformance(
    userId,
    entry.exerciseId,
    entry.variantId,
    entry.workoutId,
  );
  if (!performance || performance.sets.length === 0) {
    throw new ValidationError("Aucune séance précédente pour cet exercice.");
  }

  const context = await prisma.workoutExercise.findUnique({
    where: { id: entry.id },
    select: {
      exercise: { select: { defaultUnit: true } },
      variant: { select: { unit: true } },
    },
  });
  if (!context) throw new NotFoundError("Exercice de séance introuvable.");

  const unit = resolveUnit(context.exercise.defaultUnit, context.variant?.unit);

  await prisma.$transaction(async (tx) => {
    await tx.workoutSet.deleteMany({ where: { workoutExerciseId: entry.id } });
    await tx.workoutSet.createMany({
      data: performance.sets.map((set, index) => ({
        workoutExerciseId: entry.id,
        setNumber: index + 1,
        weight: set.weight,
        weightUnit: unit,
        weightKg: toKilograms(set.weight, unit),
        reps: set.reps,
        // Recopiées comme proposition : c'est à l'utilisateur de les valider
        // une fois réellement effectuées.
        isCompleted: false,
        completedAt: null,
      })),
    });

    await recalculateWorkoutTotals(tx, entry.workoutId);
    await refreshPersonalRecords(tx, userId, [
      { exerciseId: entry.exerciseId, variantId: entry.variantId },
    ]);
  });

  return getWorkout(userId, entry.workoutId);
}
