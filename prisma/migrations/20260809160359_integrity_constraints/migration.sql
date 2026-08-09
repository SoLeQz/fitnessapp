-- Contraintes d'intégrité que le schéma Prisma ne peut pas exprimer.
-- Elles sont volontairement posées en base : la couche service les respecte
-- déjà, la base garantit qu'aucun chemin (script, import, requête manuelle)
-- ne puisse les contourner.

-- ---------------------------------------------------------------------------
-- Unicité avec colonnes NULL (PostgreSQL 15+ : NULLS NOT DISTINCT)
-- ---------------------------------------------------------------------------

-- Un même nom ne peut exister deux fois pour un même propriétaire, et le
-- catalogue commun (ownerId IS NULL) est lui aussi dédoublonné.
CREATE UNIQUE INDEX "exercises_owner_normalized_name_key"
  ON "exercises" ("ownerId", "normalizedName") NULLS NOT DISTINCT;

-- Un seul record courant par (utilisateur, exercice, variante, type),
-- variante NULL comprise.
CREATE UNIQUE INDEX "personal_records_scope_type_key"
  ON "personal_records" ("userId", "exerciseId", "variantId", "type") NULLS NOT DISTINCT;

-- ---------------------------------------------------------------------------
-- Index partiel : une seule séance en cours par utilisateur
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX "workouts_one_in_progress_per_user_key"
  ON "workouts" ("userId") WHERE "status" = 'IN_PROGRESS';

-- ---------------------------------------------------------------------------
-- Contraintes de domaine
-- ---------------------------------------------------------------------------

ALTER TABLE "users"
  ADD CONSTRAINT "users_default_rest_range_check"
    CHECK ("defaultRestSeconds" >= 0 AND "defaultRestSeconds" <= 3600),
  ADD CONSTRAINT "users_preferred_unit_check"
    CHECK ("preferredUnit" IN ('KG', 'LBS'));

ALTER TABLE "exercise_variants"
  ADD CONSTRAINT "exercise_variants_increment_positive_check"
    CHECK ("weightIncrement" > 0);

ALTER TABLE "workout_program_exercises"
  ADD CONSTRAINT "program_exercises_target_sets_check"
    CHECK ("targetSets" >= 1 AND "targetSets" <= 20),
  ADD CONSTRAINT "program_exercises_target_reps_check"
    CHECK (
      ("targetRepsMin" IS NULL OR "targetRepsMin" >= 1)
      AND ("targetRepsMax" IS NULL OR "targetRepsMax" >= 1)
      AND ("targetRepsMin" IS NULL OR "targetRepsMax" IS NULL OR "targetRepsMin" <= "targetRepsMax")
    ),
  ADD CONSTRAINT "program_exercises_rest_check"
    CHECK ("targetRestSeconds" IS NULL OR ("targetRestSeconds" >= 0 AND "targetRestSeconds" <= 3600));

ALTER TABLE "workouts"
  ADD CONSTRAINT "workouts_finished_after_started_check"
    CHECK ("finishedAt" IS NULL OR "finishedAt" >= "startedAt"),
  -- Une séance terminée porte toujours sa date de fin, et inversement une
  -- séance en cours n'en a pas.
  ADD CONSTRAINT "workouts_status_finished_coherence_check"
    CHECK (
      ("status" = 'IN_PROGRESS' AND "finishedAt" IS NULL)
      OR ("status" <> 'IN_PROGRESS' AND "finishedAt" IS NOT NULL)
    ),
  ADD CONSTRAINT "workouts_totals_non_negative_check"
    CHECK ("totalSets" >= 0 AND "totalVolumeKg" >= 0 AND ("durationSeconds" IS NULL OR "durationSeconds" >= 0));

ALTER TABLE "sets"
  ADD CONSTRAINT "sets_set_number_check"
    CHECK ("setNumber" >= 1),
  ADD CONSTRAINT "sets_measures_non_negative_check"
    CHECK (
      ("weight" IS NULL OR "weight" >= 0)
      AND ("weightKg" IS NULL OR "weightKg" >= 0)
      AND ("reps" IS NULL OR "reps" >= 0)
      AND ("durationSeconds" IS NULL OR "durationSeconds" >= 0)
      AND ("distanceMeters" IS NULL OR "distanceMeters" >= 0)
      AND ("restSeconds" IS NULL OR "restSeconds" >= 0)
    ),
  ADD CONSTRAINT "sets_rpe_range_check"
    CHECK ("rpe" IS NULL OR ("rpe" >= 1 AND "rpe" <= 10)),
  -- Seules les unités convertibles peuvent porter un équivalent en kilos :
  -- un « niveau 8 » de machine ne doit jamais entrer dans un volume en kg.
  ADD CONSTRAINT "sets_weight_kg_only_for_convertible_units_check"
    CHECK ("weightUnit" IN ('KG', 'LBS') OR "weightKg" IS NULL);

ALTER TABLE "body_weight_entries"
  ADD CONSTRAINT "body_weight_entries_positive_check"
    CHECK ("weightKg" > 0 AND "weightKg" < 700);

ALTER TABLE "personal_records"
  ADD CONSTRAINT "personal_records_value_non_negative_check"
    CHECK ("value" >= 0);
