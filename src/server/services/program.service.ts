import type { LoadUnit, MuscleGroup } from "@/generated/prisma/enums";
import { WorkoutStatus } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import type {
  AddProgramExerciseInput,
  CreateProgramDayInput,
  CreateProgramInput,
  UpdateProgramDayInput,
  UpdateProgramExerciseInput,
  UpdateProgramInput,
} from "@/server/validation/program";

export interface ProgramExerciseView {
  id: string;
  position: number;
  targetSets: number;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetRestSeconds: number | null;
  notes: string | null;
  exercise: { id: string; name: string; muscleGroup: MuscleGroup };
  variant: { id: string; label: string; unit: LoadUnit } | null;
}

export interface ProgramDayView {
  id: string;
  name: string;
  position: number;
  notes: string | null;
  exercises: ProgramExerciseView[];
  /** Date de la dernière séance issue de ce jour, pour savoir où on en est. */
  lastPerformedAt: Date | null;
}

export interface ProgramView {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  days: ProgramDayView[];
}

export interface ProgramSummary {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  dayCount: number;
  exerciseCount: number;
  dayNames: string[];
}

const PROGRAM_INCLUDE = {
  days: {
    orderBy: { position: "asc" as const },
    select: {
      id: true,
      name: true,
      position: true,
      notes: true,
      exercises: {
        orderBy: { position: "asc" as const },
        select: {
          id: true,
          position: true,
          targetSets: true,
          targetRepsMin: true,
          targetRepsMax: true,
          targetRestSeconds: true,
          notes: true,
          exercise: { select: { id: true, name: true, muscleGroup: true } },
          variant: { select: { id: true, label: true, unit: true } },
        },
      },
    },
  },
};

export async function listPrograms(userId: string): Promise<ProgramSummary[]> {
  const programs = await prisma.workoutProgram.findMany({
    where: { userId },
    orderBy: [{ isArchived: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      isArchived: true,
      days: {
        orderBy: { position: "asc" },
        select: { name: true, _count: { select: { exercises: true } } },
      },
    },
  });

  return programs.map((program) => ({
    id: program.id,
    name: program.name,
    description: program.description,
    isArchived: program.isArchived,
    dayCount: program.days.length,
    exerciseCount: program.days.reduce((total, day) => total + day._count.exercises, 0),
    dayNames: program.days.map((day) => day.name),
  }));
}

export async function getProgram(userId: string, programId: string): Promise<ProgramView> {
  const program = await prisma.workoutProgram.findFirst({
    where: { id: programId, userId },
    select: { id: true, name: true, description: true, isArchived: true, ...PROGRAM_INCLUDE },
  });
  if (!program) throw new NotFoundError("Programme introuvable.");

  // Dernière séance réalisée pour chaque jour du programme.
  const lastByDay = new Map<string, Date>();
  if (program.days.length > 0) {
    const workouts = await prisma.workout.findMany({
      where: {
        userId,
        status: WorkoutStatus.COMPLETED,
        programDayId: { in: program.days.map((day) => day.id) },
      },
      orderBy: { startedAt: "desc" },
      select: { programDayId: true, startedAt: true },
    });
    for (const workout of workouts) {
      if (workout.programDayId && !lastByDay.has(workout.programDayId)) {
        lastByDay.set(workout.programDayId, workout.startedAt);
      }
    }
  }

  return {
    id: program.id,
    name: program.name,
    description: program.description,
    isArchived: program.isArchived,
    days: program.days.map((day) => ({
      id: day.id,
      name: day.name,
      position: day.position,
      notes: day.notes,
      exercises: day.exercises,
      lastPerformedAt: lastByDay.get(day.id) ?? null,
    })),
  };
}

export async function createProgram(
  userId: string,
  input: CreateProgramInput,
): Promise<ProgramView> {
  const duplicate = await prisma.workoutProgram.findUnique({
    where: { userId_name: { userId, name: input.name } },
    select: { id: true },
  });
  if (duplicate) throw new ConflictError("Vous avez déjà un programme portant ce nom.");

  const program = await prisma.workoutProgram.create({
    data: { userId, name: input.name, description: input.description ?? null },
    select: { id: true },
  });
  return getProgram(userId, program.id);
}

async function requireProgram(userId: string, programId: string): Promise<{ id: string }> {
  const program = await prisma.workoutProgram.findFirst({
    where: { id: programId, userId },
    select: { id: true },
  });
  if (!program) throw new NotFoundError("Programme introuvable.");
  return program;
}

export async function updateProgram(
  userId: string,
  programId: string,
  input: UpdateProgramInput,
): Promise<ProgramView> {
  await requireProgram(userId, programId);
  await prisma.workoutProgram.update({
    where: { id: programId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
    },
  });
  return getProgram(userId, programId);
}

export async function deleteProgram(userId: string, programId: string): Promise<void> {
  await requireProgram(userId, programId);
  // Les séances passées survivent : `workouts.programDayId` passe à NULL.
  await prisma.workoutProgram.delete({ where: { id: programId } });
}

export async function addProgramDay(
  userId: string,
  programId: string,
  input: CreateProgramDayInput,
): Promise<ProgramView> {
  await requireProgram(userId, programId);

  const last = await prisma.programDay.findFirst({
    where: { programId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.programDay.create({
    data: {
      programId,
      name: input.name,
      notes: input.notes ?? null,
      position: (last?.position ?? -1) + 1,
    },
  });
  return getProgram(userId, programId);
}

async function requireProgramDay(
  userId: string,
  dayId: string,
): Promise<{ id: string; programId: string }> {
  const day = await prisma.programDay.findFirst({
    where: { id: dayId, program: { userId } },
    select: { id: true, programId: true },
  });
  if (!day) throw new NotFoundError("Jour de programme introuvable.");
  return day;
}

export async function updateProgramDay(
  userId: string,
  dayId: string,
  input: UpdateProgramDayInput,
): Promise<ProgramView> {
  const day = await requireProgramDay(userId, dayId);
  await prisma.programDay.update({
    where: { id: day.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
    },
  });
  return getProgram(userId, day.programId);
}

export async function deleteProgramDay(userId: string, dayId: string): Promise<ProgramView> {
  const day = await requireProgramDay(userId, dayId);
  await prisma.programDay.delete({ where: { id: day.id } });
  return getProgram(userId, day.programId);
}

export async function addProgramExercise(
  userId: string,
  dayId: string,
  input: AddProgramExerciseInput,
): Promise<ProgramView> {
  const day = await requireProgramDay(userId, dayId);

  const exercise = await prisma.exercise.findFirst({
    where: { id: input.exerciseId, OR: [{ ownerId: null }, { ownerId: userId }] },
    select: { id: true },
  });
  if (!exercise) throw new NotFoundError("Exercice introuvable.");

  if (input.variantId) {
    const variant = await prisma.exerciseVariant.findFirst({
      where: { id: input.variantId, userId, exerciseId: input.exerciseId },
      select: { id: true },
    });
    if (!variant) throw new NotFoundError("Machine introuvable pour cet exercice.");
  }

  assertRepRange(input.targetRepsMin, input.targetRepsMax);

  const last = await prisma.programExercise.findFirst({
    where: { programDayId: day.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.programExercise.create({
    data: {
      programDayId: day.id,
      exerciseId: input.exerciseId,
      variantId: input.variantId ?? null,
      position: (last?.position ?? -1) + 1,
      targetSets: input.targetSets,
      targetRepsMin: input.targetRepsMin ?? null,
      targetRepsMax: input.targetRepsMax ?? null,
      targetRestSeconds: input.targetRestSeconds ?? null,
      notes: input.notes ?? null,
    },
  });

  return getProgram(userId, day.programId);
}

/** La base impose déjà min <= max ; ce contrôle renvoie un message lisible. */
function assertRepRange(min: number | null | undefined, max: number | null | undefined): void {
  if (min != null && max != null && min > max) {
    throw new ValidationError("Le nombre minimum de répétitions dépasse le maximum.");
  }
}

export async function updateProgramExercise(
  userId: string,
  programExerciseId: string,
  input: UpdateProgramExerciseInput,
): Promise<ProgramView> {
  const entry = await prisma.programExercise.findFirst({
    where: { id: programExerciseId, programDay: { program: { userId } } },
    select: {
      id: true,
      exerciseId: true,
      targetRepsMin: true,
      targetRepsMax: true,
      programDay: { select: { programId: true } },
    },
  });
  if (!entry) throw new NotFoundError("Exercice de programme introuvable.");

  assertRepRange(
    input.targetRepsMin !== undefined ? input.targetRepsMin : entry.targetRepsMin,
    input.targetRepsMax !== undefined ? input.targetRepsMax : entry.targetRepsMax,
  );

  if (input.variantId) {
    const variant = await prisma.exerciseVariant.findFirst({
      where: { id: input.variantId, userId, exerciseId: entry.exerciseId },
      select: { id: true },
    });
    if (!variant) throw new NotFoundError("Machine introuvable pour cet exercice.");
  }

  await prisma.programExercise.update({
    where: { id: entry.id },
    data: {
      ...(input.variantId !== undefined ? { variantId: input.variantId } : {}),
      ...(input.targetSets !== undefined ? { targetSets: input.targetSets } : {}),
      ...(input.targetRepsMin !== undefined ? { targetRepsMin: input.targetRepsMin } : {}),
      ...(input.targetRepsMax !== undefined ? { targetRepsMax: input.targetRepsMax } : {}),
      ...(input.targetRestSeconds !== undefined
        ? { targetRestSeconds: input.targetRestSeconds }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
    },
  });

  return getProgram(userId, entry.programDay.programId);
}

export async function removeProgramExercise(
  userId: string,
  programExerciseId: string,
): Promise<ProgramView> {
  const entry = await prisma.programExercise.findFirst({
    where: { id: programExerciseId, programDay: { program: { userId } } },
    select: { id: true, programDay: { select: { programId: true } } },
  });
  if (!entry) throw new NotFoundError("Exercice de programme introuvable.");

  await prisma.programExercise.delete({ where: { id: entry.id } });
  return getProgram(userId, entry.programDay.programId);
}
