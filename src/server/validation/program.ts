import { z } from "zod";

const cuid = z.string().min(1).max(40);

export const createProgramSchema = z.object({
  name: z.string().trim().min(2, "Le nom est requis").max(80),
  description: z.string().trim().max(600).optional(),
});

export const updateProgramSchema = createProgramSchema.partial().extend({
  isArchived: z.boolean().optional(),
});

export const createProgramDaySchema = z.object({
  name: z.string().trim().min(1, "Le nom du jour est requis").max(60),
  notes: z.string().trim().max(600).optional(),
});

export const updateProgramDaySchema = createProgramDaySchema.partial().extend({
  position: z.number().int().min(0).max(100).optional(),
});

export const addProgramExerciseSchema = z.object({
  exerciseId: cuid,
  variantId: cuid.nullish(),
  targetSets: z.coerce.number().int().min(1).max(20).default(3),
  targetRepsMin: z.coerce.number().int().min(1).max(1000).nullish(),
  targetRepsMax: z.coerce.number().int().min(1).max(1000).nullish(),
  targetRestSeconds: z.coerce.number().int().min(0).max(3600).nullish(),
  notes: z.string().trim().max(300).nullish(),
});

export const updateProgramExerciseSchema = addProgramExerciseSchema
  .partial()
  .omit({ exerciseId: true })
  .extend({ position: z.number().int().min(0).max(100).optional() });

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;
export type CreateProgramDayInput = z.infer<typeof createProgramDaySchema>;
export type UpdateProgramDayInput = z.infer<typeof updateProgramDaySchema>;
export type AddProgramExerciseInput = z.infer<typeof addProgramExerciseSchema>;
export type UpdateProgramExerciseInput = z.infer<typeof updateProgramExerciseSchema>;
