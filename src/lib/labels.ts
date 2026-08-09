import {
  ExerciseCategory,
  MuscleGroup,
  TrackingMode,
  WorkoutStatus,
  PersonalRecordType,
} from "@/generated/prisma/enums";

export const MUSCLE_GROUP_LABEL: Record<MuscleGroup, string> = {
  [MuscleGroup.CHEST]: "Pectoraux",
  [MuscleGroup.BACK]: "Dos",
  [MuscleGroup.SHOULDERS]: "Épaules",
  [MuscleGroup.BICEPS]: "Biceps",
  [MuscleGroup.TRICEPS]: "Triceps",
  [MuscleGroup.FOREARMS]: "Avant-bras",
  [MuscleGroup.QUADS]: "Quadriceps",
  [MuscleGroup.HAMSTRINGS]: "Ischio-jambiers",
  [MuscleGroup.GLUTES]: "Fessiers",
  [MuscleGroup.CALVES]: "Mollets",
  [MuscleGroup.CORE]: "Abdominaux",
  [MuscleGroup.CARDIO]: "Cardio",
  [MuscleGroup.FULL_BODY]: "Corps entier",
};

export const EXERCISE_CATEGORY_LABEL: Record<ExerciseCategory, string> = {
  [ExerciseCategory.MACHINE]: "Machine",
  [ExerciseCategory.DUMBBELL]: "Haltères",
  [ExerciseCategory.BARBELL]: "Barre",
  [ExerciseCategory.BODYWEIGHT]: "Poids du corps",
  [ExerciseCategory.CABLE]: "Câble",
  [ExerciseCategory.CARDIO]: "Cardio",
  [ExerciseCategory.OTHER]: "Autre",
};

export const TRACKING_MODE_LABEL: Record<TrackingMode, string> = {
  [TrackingMode.WEIGHT_REPS]: "Charge et répétitions",
  [TrackingMode.REPS_ONLY]: "Répétitions seules",
  [TrackingMode.TIME]: "Durée",
  [TrackingMode.DISTANCE_TIME]: "Distance et durée",
};

export const WORKOUT_STATUS_LABEL: Record<WorkoutStatus, string> = {
  [WorkoutStatus.IN_PROGRESS]: "En cours",
  [WorkoutStatus.COMPLETED]: "Terminée",
  [WorkoutStatus.ABANDONED]: "Abandonnée",
};

export const PERSONAL_RECORD_LABEL: Record<PersonalRecordType, string> = {
  [PersonalRecordType.MAX_WEIGHT]: "Charge maximale",
  [PersonalRecordType.MAX_REPS]: "Répétitions maximales",
  [PersonalRecordType.BEST_SET_VOLUME]: "Meilleur volume sur une série",
  [PersonalRecordType.BEST_EST_1RM]: "Meilleur 1RM estimé",
  [PersonalRecordType.BEST_SESSION_VOLUME]: "Meilleur volume sur une séance",
};

/** Listes ordonnées pour les menus déroulants et les filtres. */
export const MUSCLE_GROUP_OPTIONS = Object.values(MuscleGroup).map((value) => ({
  value,
  label: MUSCLE_GROUP_LABEL[value],
}));

export const EXERCISE_CATEGORY_OPTIONS = Object.values(ExerciseCategory).map((value) => ({
  value,
  label: EXERCISE_CATEGORY_LABEL[value],
}));

export const TRACKING_MODE_OPTIONS = Object.values(TrackingMode).map((value) => ({
  value,
  label: TRACKING_MODE_LABEL[value],
}));
