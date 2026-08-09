import { z } from "zod";
import {
  ExerciseCategory,
  LoadUnit,
  MuscleGroup,
  TrackingMode,
} from "@/generated/prisma/enums";

const enumValues = <T extends Record<string, string>>(source: T) =>
  Object.values(source) as [T[keyof T], ...T[keyof T][]];

export const muscleGroupSchema = z.enum(enumValues(MuscleGroup));
export const exerciseCategorySchema = z.enum(enumValues(ExerciseCategory));
export const trackingModeSchema = z.enum(enumValues(TrackingMode));
export const loadUnitSchema = z.enum(enumValues(LoadUnit));

export const exerciseNameSchema = z
  .string()
  .trim()
  .min(2, "Le nom doit faire au moins 2 caractères")
  .max(80, "Le nom ne peut pas dépasser 80 caractères");

export const createExerciseSchema = z.object({
  name: exerciseNameSchema,
  muscleGroup: muscleGroupSchema,
  secondaryMuscles: z.array(muscleGroupSchema).max(4).default([]),
  category: exerciseCategorySchema,
  trackingMode: trackingModeSchema.default(TrackingMode.WEIGHT_REPS),
  defaultUnit: loadUnitSchema.default(LoadUnit.KG),
  description: z.string().trim().max(600).optional(),
  imageUrl: z.url("URL d'image invalide").max(500).optional(),
});

export const updateExerciseSchema = createExerciseSchema.partial().extend({
  isArchived: z.boolean().optional(),
});

/** Filtres de la bibliothèque. Tous facultatifs, combinables. */
export const exerciseFiltersSchema = z.object({
  query: z.string().trim().max(80).optional(),
  muscleGroup: muscleGroupSchema.optional(),
  category: exerciseCategorySchema.optional(),
  favoritesOnly: z.coerce.boolean().optional(),
  mineOnly: z.coerce.boolean().optional(),
  includeArchived: z.coerce.boolean().optional(),
});

export const variantLabelSchema = z
  .string()
  .trim()
  .min(1, "Le nom de la machine est requis")
  .max(60, "Le nom ne peut pas dépasser 60 caractères");

export const createVariantSchema = z.object({
  label: variantLabelSchema,
  unit: loadUnitSchema.default(LoadUnit.KG),
  weightIncrement: z.coerce
    .number()
    .positive("Le pas doit être supérieur à zéro")
    .max(100, "Le pas ne peut pas dépasser 100"),
  notes: z.string().trim().max(300).optional(),
  isDefault: z.boolean().default(false),
});

export const updateVariantSchema = createVariantSchema.partial().extend({
  isArchived: z.boolean().optional(),
});

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
export type ExerciseFilters = z.infer<typeof exerciseFiltersSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
