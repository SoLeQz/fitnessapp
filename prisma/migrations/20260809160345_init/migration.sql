-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'FOREARMS', 'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'CORE', 'CARDIO', 'FULL_BODY');

-- CreateEnum
CREATE TYPE "ExerciseCategory" AS ENUM ('MACHINE', 'DUMBBELL', 'BARBELL', 'BODYWEIGHT', 'CABLE', 'CARDIO', 'OTHER');

-- CreateEnum
CREATE TYPE "LoadUnit" AS ENUM ('KG', 'LBS', 'LEVEL', 'BODYWEIGHT', 'NONE');

-- CreateEnum
CREATE TYPE "TrackingMode" AS ENUM ('WEIGHT_REPS', 'REPS_ONLY', 'TIME', 'DISTANCE_TIME');

-- CreateEnum
CREATE TYPE "WorkoutStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "PersonalRecordType" AS ENUM ('MAX_WEIGHT', 'MAX_REPS', 'BEST_SET_VOLUME', 'BEST_EST_1RM', 'BEST_SESSION_VOLUME');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "preferredUnit" "LoadUnit" NOT NULL DEFAULT 'KG',
    "defaultRestSeconds" INTEGER NOT NULL DEFAULT 90,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "muscleGroup" "MuscleGroup" NOT NULL,
    "secondaryMuscles" "MuscleGroup"[],
    "category" "ExerciseCategory" NOT NULL,
    "trackingMode" "TrackingMode" NOT NULL DEFAULT 'WEIGHT_REPS',
    "defaultUnit" "LoadUnit" NOT NULL DEFAULT 'KG',
    "description" TEXT,
    "imageUrl" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_variants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" "LoadUnit" NOT NULL DEFAULT 'KG',
    "weightIncrement" DECIMAL(6,3) NOT NULL DEFAULT 2.5,
    "notes" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_favorites" (
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_favorites_pkey" PRIMARY KEY ("userId","exerciseId")
);

-- CreateTable
CREATE TABLE "workout_programs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_days" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_program_exercises" (
    "id" TEXT NOT NULL,
    "programDayId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "variantId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "targetSets" INTEGER NOT NULL DEFAULT 3,
    "targetRepsMin" INTEGER,
    "targetRepsMax" INTEGER,
    "targetRestSeconds" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_program_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workouts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programDayId" TEXT,
    "name" TEXT NOT NULL,
    "status" "WorkoutStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "notes" TEXT,
    "totalVolumeKg" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "totalSets" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_exercises" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "variantId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sets" (
    "id" TEXT NOT NULL,
    "workoutExerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "isWarmup" BOOLEAN NOT NULL DEFAULT false,
    "isCompleted" BOOLEAN NOT NULL DEFAULT true,
    "weight" DECIMAL(8,3),
    "weightUnit" "LoadUnit" NOT NULL DEFAULT 'KG',
    "weightKg" DECIMAL(8,3),
    "reps" INTEGER,
    "durationSeconds" INTEGER,
    "distanceMeters" DECIMAL(10,2),
    "restSeconds" INTEGER,
    "rpe" DECIMAL(3,1),
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "body_weight_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weightKg" DECIMAL(6,3) NOT NULL,
    "unit" "LoadUnit" NOT NULL DEFAULT 'KG',
    "measuredOn" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "body_weight_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "variantId" TEXT,
    "type" "PersonalRecordType" NOT NULL,
    "value" DECIMAL(12,3) NOT NULL,
    "weight" DECIMAL(8,3),
    "weightUnit" "LoadUnit",
    "reps" INTEGER,
    "workoutId" TEXT,
    "achievedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "exercises_ownerId_idx" ON "exercises"("ownerId");

-- CreateIndex
CREATE INDEX "exercises_muscleGroup_idx" ON "exercises"("muscleGroup");

-- CreateIndex
CREATE INDEX "exercises_normalizedName_idx" ON "exercises"("normalizedName");

-- CreateIndex
CREATE INDEX "exercise_variants_userId_exerciseId_idx" ON "exercise_variants"("userId", "exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_variants_userId_exerciseId_label_key" ON "exercise_variants"("userId", "exerciseId", "label");

-- CreateIndex
CREATE INDEX "workout_programs_userId_idx" ON "workout_programs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "workout_programs_userId_name_key" ON "workout_programs"("userId", "name");

-- CreateIndex
CREATE INDEX "program_days_programId_position_idx" ON "program_days"("programId", "position");

-- CreateIndex
CREATE INDEX "workout_program_exercises_programDayId_position_idx" ON "workout_program_exercises"("programDayId", "position");

-- CreateIndex
CREATE INDEX "workout_program_exercises_exerciseId_idx" ON "workout_program_exercises"("exerciseId");

-- CreateIndex
CREATE INDEX "workouts_userId_startedAt_idx" ON "workouts"("userId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "workouts_userId_status_idx" ON "workouts"("userId", "status");

-- CreateIndex
CREATE INDEX "workout_exercises_workoutId_position_idx" ON "workout_exercises"("workoutId", "position");

-- CreateIndex
CREATE INDEX "workout_exercises_exerciseId_idx" ON "workout_exercises"("exerciseId");

-- CreateIndex
CREATE INDEX "sets_workoutExerciseId_idx" ON "sets"("workoutExerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "sets_workoutExerciseId_setNumber_key" ON "sets"("workoutExerciseId", "setNumber");

-- CreateIndex
CREATE INDEX "body_weight_entries_userId_measuredOn_idx" ON "body_weight_entries"("userId", "measuredOn" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "body_weight_entries_userId_measuredOn_key" ON "body_weight_entries"("userId", "measuredOn");

-- CreateIndex
CREATE INDEX "personal_records_userId_achievedAt_idx" ON "personal_records"("userId", "achievedAt" DESC);

-- CreateIndex
CREATE INDEX "personal_records_userId_exerciseId_idx" ON "personal_records"("userId", "exerciseId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_variants" ADD CONSTRAINT "exercise_variants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_variants" ADD CONSTRAINT "exercise_variants_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_favorites" ADD CONSTRAINT "exercise_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_favorites" ADD CONSTRAINT "exercise_favorites_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_programs" ADD CONSTRAINT "workout_programs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_days" ADD CONSTRAINT "program_days_programId_fkey" FOREIGN KEY ("programId") REFERENCES "workout_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_program_exercises" ADD CONSTRAINT "workout_program_exercises_programDayId_fkey" FOREIGN KEY ("programDayId") REFERENCES "program_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_program_exercises" ADD CONSTRAINT "workout_program_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_program_exercises" ADD CONSTRAINT "workout_program_exercises_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "exercise_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_programDayId_fkey" FOREIGN KEY ("programDayId") REFERENCES "program_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "exercise_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sets" ADD CONSTRAINT "sets_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "workout_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_weight_entries" ADD CONSTRAINT "body_weight_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "exercise_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "workouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
