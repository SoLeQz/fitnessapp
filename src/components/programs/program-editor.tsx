"use client";

import { useState, useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { ExercisePicker } from "@/components/workout/exercise-picker";
import { StartWorkoutButton } from "@/components/workout/start-workout-button";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, Badge, EmptyState } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import { formatRelativeDays } from "@/lib/date";
import { toDisplayMessage } from "@/lib/errors";
import { MUSCLE_GROUP_LABEL } from "@/lib/labels";
import type { ProgramView } from "@/server/services/program.service";
import {
  addExerciseToDayAction,
  deleteDayAction,
  removeProgramExerciseAction,
  updateProgramExerciseAction,
} from "@/app/(app)/programs/actions";

/**
 * Édition des jours d'un programme. Chaque jour est le point de départ d'une
 * séance : le bouton « Démarrer » y est donc directement présent.
 */
export function ProgramEditor({ initialProgram }: { initialProgram: ProgramView }) {
  const [program, setProgram] = useState(initialProgram);
  const [error, setError] = useState<string | null>(null);
  const [pickerDayId, setPickerDayId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (mutate: () => Promise<ProgramView>) => {
    setError(null);
    startTransition(async () => {
      try {
        setProgram(await mutate());
      } catch (cause) {
        setError(toDisplayMessage(cause));
      }
    });
  };

  if (program.days.length === 0) {
    return (
      <EmptyState
        title="Aucun jour dans ce programme"
        description="Ajoutez un jour — « Push », « Pull », « Legs » — puis ses exercices."
      />
    );
  }

  return (
    <div className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {program.days.map((day) => (
        <Card key={day.id}>
          <CardHeader
            title={day.name}
            subtitle={
              day.lastPerformedAt
                ? `Dernière fois ${formatRelativeDays(day.lastPerformedAt)}`
                : "Jamais réalisé"
            }
            action={
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => run(() => deleteDayAction(day.id))}
                aria-label={`Supprimer le jour ${day.name}`}
                className="text-fg-subtle hover:text-danger"
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            }
          />

          <CardBody className="space-y-3 pt-2">
            {day.exercises.length === 0 ? (
              <p className="text-sm text-fg-muted">Aucun exercice pour l’instant.</p>
            ) : (
              <ol className="space-y-1.5">
                {day.exercises.map((entry, index) => (
                  <li
                    key={entry.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated px-3 py-2"
                  >
                    <span className="tabular w-4 shrink-0 text-xs text-fg-subtle">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {entry.exercise.name}
                        </span>
                        {entry.variant ? (
                          <Badge tone="accent">{entry.variant.label}</Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-fg-subtle">
                        {MUSCLE_GROUP_LABEL[entry.exercise.muscleGroup]}
                        {entry.targetRepsMin && entry.targetRepsMax
                          ? ` · ${entry.targetRepsMin}–${entry.targetRepsMax} reps`
                          : ""}
                        {entry.targetRestSeconds ? ` · repos ${entry.targetRestSeconds}s` : ""}
                      </p>
                    </div>

                    <SetsStepper
                      value={entry.targetSets}
                      disabled={isPending}
                      onChange={(targetSets) =>
                        run(() => updateProgramExerciseAction(entry.id, { targetSets }))
                      }
                    />

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => run(() => removeProgramExerciseAction(entry.id))}
                      aria-label={`Retirer ${entry.exercise.name}`}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:text-danger"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ol>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="md"
                disabled={isPending}
                onClick={() => setPickerDayId(day.id)}
              >
                <Plus className="size-4" aria-hidden />
                Ajouter un exercice
              </Button>
            </div>

            {day.exercises.length > 0 ? (
              <StartWorkoutButton
                label={`Démarrer ${day.name}`}
                programDayId={day.id}
                size="lg"
              />
            ) : null}
          </CardBody>
        </Card>
      ))}

      {pickerDayId ? (
        <ExercisePicker
          disabled={isPending}
          onClose={() => setPickerDayId(null)}
          onSelect={(exerciseId) => {
            const dayId = pickerDayId;
            setPickerDayId(null);
            run(() => addExerciseToDayAction(dayId, { exerciseId, targetSets: 3 }));
          }}
        />
      ) : null}
    </div>
  );
}

/** Nombre de séries cibles, ajustable sans quitter la liste. */
function SetsStepper({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <StepperButton
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={disabled || value <= 1}
        label="Une série de moins"
      >
        <Minus className="size-3.5" aria-hidden />
      </StepperButton>
      <span className="tabular w-12 text-center text-xs">
        {value} <span className="text-fg-subtle">sér.</span>
      </span>
      <StepperButton
        onClick={() => onChange(Math.min(20, value + 1))}
        disabled={disabled || value >= 20}
        label="Une série de plus"
      >
        <Plus className="size-3.5" aria-hidden />
      </StepperButton>
    </div>
  );
}

function StepperButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-lg border border-border",
        "text-fg-muted transition-colors hover:text-fg disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}
