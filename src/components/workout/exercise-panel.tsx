"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  CopyPlus,
  History,
  Repeat,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { NumberStepper } from "./number-stepper";
import { Badge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { TrackingMode } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import { formatRelativeDays } from "@/lib/date";
import { formatClock } from "@/lib/format";
import { formatWeight } from "@/lib/load-unit";
import type { WorkoutExerciseView, WorkoutSetView } from "@/server/services/workout-view";

/** Champs de saisie pertinents selon ce que l'exercice mesure. */
function fieldsFor(mode: TrackingMode) {
  return {
    weight: mode === TrackingMode.WEIGHT_REPS,
    reps: mode === TrackingMode.WEIGHT_REPS || mode === TrackingMode.REPS_ONLY,
    duration: mode === TrackingMode.TIME || mode === TrackingMode.DISTANCE_TIME,
    distance: mode === TrackingMode.DISTANCE_TIME,
  };
}

/** Valeurs en cours de saisie pour une série. */
export interface SetDraft {
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
}

/** Série soumise à l'enregistrement, avec le repos à démarrer ensuite. */
export interface SubmittedSet extends SetDraft {
  restSeconds: number;
}

function draftFromSet(set: WorkoutSetView): SetDraft {
  return {
    weight: set.weight,
    reps: set.reps,
    durationSeconds: set.durationSeconds,
    distanceMeters: set.distanceMeters,
  };
}

/** Valeurs pré-remplies : dernière série de la séance, sinon dernière séance. */
function initialDraft(entry: WorkoutExerciseView): SetDraft {
  const lastSet = entry.sets.at(-1);
  if (lastSet) return draftFromSet(lastSet);

  const previous = entry.lastPerformance?.sets.at(0);
  return {
    weight: previous?.weight ?? null,
    reps: previous?.reps ?? null,
    durationSeconds: null,
    distanceMeters: null,
  };
}

export interface ExercisePanelProps {
  entry: WorkoutExerciseView;
  restSeconds: number;
  isBusy: boolean;
  onAddSet: (input: SubmittedSet) => void;
  onUpdateSet: (setId: string, input: Partial<SetDraft> & { isCompleted?: boolean }) => void;
  onDeleteSet: (setId: string) => void;
  onRepeatLast: () => void;
  onCopyLastSession: () => void;
  onSelectVariant: (variantId: string | null) => void;
  onRemove: () => void;
}

export function ExercisePanel({
  entry,
  restSeconds,
  isBusy,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onRepeatLast,
  onCopyLastSession,
  onSelectVariant,
  onRemove,
}: ExercisePanelProps) {
  const fields = fieldsFor(entry.exercise.trackingMode);
  const [draft, setDraft] = useState<SetDraft>(() => initialDraft(entry));
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [isCollapsed, setCollapsed] = useState(false);

  const completedSets = entry.sets.filter((set) => set.isCompleted).length;

  // Le repos reprend celui de la dernière série saisie : on garde le rythme
  // choisi sur cet exercice plutôt que le réglage global.
  const effectiveRestSeconds = entry.sets.at(-1)?.restSeconds ?? restSeconds;

  const submit = () => {
    if (editingSetId) {
      onUpdateSet(editingSetId, { ...draft, isCompleted: true });
      setEditingSetId(null);
    } else {
      onAddSet({ ...draft, restSeconds: effectiveRestSeconds });
    }
  };

  const startEditing = (set: WorkoutSetView) => {
    setEditingSetId(set.id);
    setDraft(draftFromSet(set));
  };

  const cancelEditing = () => {
    setEditingSetId(null);
    setDraft(initialDraft(entry));
  };

  return (
    <section
      className={cn(
        "overflow-hidden rounded-card border bg-surface shadow-card transition-colors",
        // Un exercice entamé se distingue à la bordure. Sur une séance de six
        // mouvements, cela évite de relire chaque titre pour retrouver où l'on
        // en est en revenant du vestiaire.
        completedSets > 0 ? "border-success/35" : "border-border",
      )}
    >
      <header className="flex items-start gap-2 px-4 pt-3.5">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
          aria-expanded={!isCollapsed}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-semibold">{entry.exercise.name}</h2>
              {entry.variant ? <Badge tone="accent">{entry.variant.label}</Badge> : null}
              {completedSets > 0 ? (
                <Badge tone="success">
                  {completedSets} série{completedSets > 1 ? "s" : ""}
                </Badge>
              ) : null}
            </div>
          </div>
          <ChevronDown
            className={cn(
              "mt-1 size-4 shrink-0 text-fg-subtle transition-transform",
              isCollapsed && "-rotate-90",
            )}
            aria-hidden
          />
        </button>
      </header>

      {entry.lastPerformance ? (
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 px-4 text-xs text-fg-muted">
          <span className="text-fg-subtle">
            Dernière séance · {formatRelativeDays(entry.lastPerformance.performedAt)}
          </span>
          <span className="tabular font-medium text-fg">{entry.lastPerformance.summary}</span>
        </p>
      ) : (
        <p className="mt-1.5 px-4 text-xs text-fg-subtle">Première fois sur cet exercice.</p>
      )}

      {isCollapsed ? (
        <div className="p-4 pt-3" />
      ) : (
        <div className="space-y-3 p-4 pt-3">
          {entry.availableVariants.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              <VariantChip
                active={entry.variant === null}
                onClick={() => onSelectVariant(null)}
                disabled={isBusy}
              >
                Sans machine
              </VariantChip>
              {entry.availableVariants.map((variant) => (
                <VariantChip
                  key={variant.id}
                  active={entry.variant?.id === variant.id}
                  onClick={() => onSelectVariant(variant.id)}
                  disabled={isBusy}
                >
                  {variant.label}
                </VariantChip>
              ))}
            </div>
          ) : null}

          {entry.sets.length > 0 ? (
            <ul className="space-y-1">
              {entry.sets.map((set) => (
                <SetRow
                  key={set.id}
                  set={set}
                  isEditing={editingSetId === set.id}
                  onEdit={() => startEditing(set)}
                  onToggleComplete={() =>
                    onUpdateSet(set.id, { isCompleted: !set.isCompleted })
                  }
                  onDelete={() => onDeleteSet(set.id)}
                  disabled={isBusy}
                />
              ))}
            </ul>
          ) : null}

          <div className="flex gap-2">
            {fields.weight ? (
              <NumberStepper
                label="Charge"
                suffix={entry.resolvedUnit === "LEVEL" ? "niveau" : undefined}
                value={draft.weight}
                onChange={(weight) => setDraft((current) => ({ ...current, weight }))}
                step={entry.weightIncrement}
              />
            ) : null}
            {fields.reps ? (
              <NumberStepper
                label="Répétitions"
                value={draft.reps}
                onChange={(reps) => setDraft((current) => ({ ...current, reps }))}
                step={1}
                max={1000}
                allowDecimals={false}
              />
            ) : null}
            {fields.duration ? (
              <NumberStepper
                label="Durée"
                suffix="s"
                value={draft.durationSeconds}
                onChange={(durationSeconds) =>
                  setDraft((current) => ({ ...current, durationSeconds }))
                }
                step={15}
                max={86_400}
                allowDecimals={false}
              />
            ) : null}
            {fields.distance ? (
              <NumberStepper
                label="Distance"
                suffix="m"
                value={draft.distanceMeters}
                onChange={(distanceMeters) =>
                  setDraft((current) => ({ ...current, distanceMeters }))
                }
                step={100}
                max={1_000_000}
                allowDecimals={false}
              />
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button
              variant={editingSetId ? "success" : "primary"}
              size="lg"
              fullWidth
              disabled={isBusy}
              onClick={submit}
            >
              <Check className="size-5" aria-hidden />
              {editingSetId ? "Mettre à jour la série" : "Valider la série"}
            </Button>
            {editingSetId ? (
              <Button variant="secondary" size="lg" onClick={cancelEditing} aria-label="Annuler">
                <X className="size-5" aria-hidden />
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={isBusy || entry.sets.length === 0}
              onClick={onRepeatLast}
            >
              <Repeat className="size-3.5" aria-hidden />
              Copier la précédente
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={isBusy || !entry.lastPerformance}
              onClick={onCopyLastSession}
            >
              <CopyPlus className="size-3.5" aria-hidden />
              Copier la dernière séance
            </Button>
            <Link
              href={`/exercises/${entry.exercise.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs text-fg-muted transition-colors hover:text-fg"
            >
              <History className="size-3.5" aria-hidden />
              Historique
            </Link>
            <Button
              variant="ghost"
              size="sm"
              disabled={isBusy}
              onClick={onRemove}
              className="ml-auto text-fg-subtle hover:text-danger"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Retirer
            </Button>
          </div>

          <Button variant="secondary" size="md" fullWidth onClick={() => setCollapsed(true)}>
            Terminer l’exercice
          </Button>
        </div>
      )}
    </section>
  );
}

function VariantChip({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-50",
        active
          ? "border-accent/40 bg-accent-soft text-accent"
          : "border-border bg-bg-elevated text-fg-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function SetRow({
  set,
  isEditing,
  onEdit,
  onToggleComplete,
  onDelete,
  disabled,
}: {
  set: WorkoutSetView;
  isEditing: boolean;
  onEdit: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const measures = [
    formatWeight(set.weight, set.weightUnit),
    set.reps !== null ? `${set.reps} reps` : null,
    set.durationSeconds !== null ? formatClock(set.durationSeconds) : null,
    set.distanceMeters !== null ? `${set.distanceMeters} m` : null,
  ].filter(Boolean);

  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors",
        isEditing
          ? "border-accent/50 bg-accent-soft"
          : set.isCompleted
            ? "border-border bg-bg-elevated"
            : "border-dashed border-border bg-transparent",
      )}
    >
      <span className="tabular w-5 shrink-0 text-xs text-fg-subtle">{set.setNumber}</span>

      <button
        type="button"
        onClick={onEdit}
        disabled={disabled}
        className="tabular min-w-0 flex-1 text-left text-sm font-medium"
      >
        <span className={cn(!set.isCompleted && "text-fg-subtle")}>
          {measures.join(" × ") || "—"}
        </span>
        {set.isWarmup ? <span className="ml-2 text-xs text-fg-subtle">échauffement</span> : null}
      </button>

      <button
        type="button"
        onClick={onToggleComplete}
        disabled={disabled}
        aria-label={set.isCompleted ? "Marquer comme non réalisée" : "Marquer comme réalisée"}
        aria-pressed={set.isCompleted}
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
          set.isCompleted
            ? "border-success/40 bg-success-soft text-success"
            : "border-border text-fg-subtle hover:text-fg",
        )}
      >
        <Check className="size-4" aria-hidden />
      </button>

      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        aria-label={`Supprimer la série ${set.setNumber}`}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:text-danger"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </li>
  );
}
