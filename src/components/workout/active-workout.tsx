"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Plus, Timer, Trash2 } from "lucide-react";
import { ExercisePanel, type SubmittedSet } from "./exercise-panel";
import { ExercisePicker } from "./exercise-picker";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { formatClock, formatVolume } from "@/lib/format";
import { toDisplayMessage } from "@/lib/errors";
import { useRestTimerStore } from "@/hooks/use-rest-timer";
import type { WorkoutView } from "@/server/services/workout-view";
import {
  abandonWorkoutAction,
  addExerciseAction,
  addSetAction,
  copyLastSessionAction,
  deleteSetAction,
  finishWorkoutAction,
  removeExerciseAction,
  repeatLastSetAction,
  selectVariantAction,
  updateSetAction,
} from "@/app/(app)/workout/actions";

/** Chronomètre de la séance, recalculé depuis l'heure de début. */
function useElapsedSeconds(startedAt: Date): number {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000)),
  );

  useEffect(() => {
    const tick = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return elapsed;
}

export function ActiveWorkout({
  initialWorkout,
  defaultRestSeconds,
}: {
  initialWorkout: WorkoutView;
  defaultRestSeconds: number;
}) {
  const [workout, setWorkout] = useState(initialWorkout);
  const [error, setError] = useState<string | null>(null);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const startRest = useRestTimerStore((state) => state.start);
  const elapsed = useElapsedSeconds(new Date(workout.startedAt));

  /**
   * Toutes les mutations passent par ici : l'état affiché est toujours celui
   * que le serveur vient de confirmer, jamais une supposition locale.
   */
  const run = (mutate: () => Promise<WorkoutView>) => {
    setError(null);
    startTransition(async () => {
      try {
        setWorkout(await mutate());
      } catch (cause) {
        setError(toDisplayMessage(cause));
      }
    });
  };

  const handleAddSet = (workoutExerciseId: string, input: SubmittedSet) => {
    run(async () => {
      const updated = await addSetAction(workoutExerciseId, input);
      // Le repos démarre dès la série validée : c'est le moment où il commence
      // réellement, pas quand on pense à appuyer sur un bouton.
      startRest(input.restSeconds || defaultRestSeconds);
      return updated;
    });
  };

  const finish = () => {
    setError(null);
    startTransition(async () => {
      try {
        await finishWorkoutAction(workout.id);
      } catch (cause) {
        setError(toDisplayMessage(cause));
      }
    });
  };

  const abandon = () => {
    setError(null);
    startTransition(async () => {
      try {
        await abandonWorkoutAction(workout.id);
      } catch (cause) {
        setError(toDisplayMessage(cause));
      }
    });
  };

  const completedSets = workout.exercises.reduce(
    (total, entry) => total + entry.sets.filter((set) => set.isCompleted).length,
    0,
  );

  return (
    <div className="space-y-4">
      <header className="sticky top-0 z-30 -mx-4 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">{workout.name}</h1>
            <p className="tabular mt-0.5 flex items-center gap-2 text-xs text-fg-muted">
              <Timer className="size-3.5" aria-hidden />
              {formatClock(elapsed)}
              <span aria-hidden>·</span>
              {completedSets} série{completedSets > 1 ? "s" : ""}
              <span aria-hidden>·</span>
              {formatVolume(workout.totalVolumeKg)}
            </p>
          </div>

          <Button variant="success" size="md" onClick={finish} disabled={isPending}>
            <CheckCircle2 className="size-4" aria-hidden />
            Terminer
          </Button>
        </div>
      </header>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {workout.exercises.length === 0 ? (
        <EmptyState
          title="Séance vide"
          description="Ajoutez le premier exercice pour commencer à enregistrer vos séries."
          action={
            <Button variant="primary" size="lg" onClick={() => setPickerOpen(true)}>
              <Plus className="size-5" aria-hidden />
              Ajouter un exercice
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {workout.exercises.map((entry) => (
            <ExercisePanel
              key={entry.id}
              entry={entry}
              restSeconds={defaultRestSeconds}
              isBusy={isPending}
              onAddSet={(input) => handleAddSet(entry.id, input)}
              onUpdateSet={(setId, input) => run(() => updateSetAction(setId, input))}
              onDeleteSet={(setId) => run(() => deleteSetAction(setId))}
              onRepeatLast={() => run(() => repeatLastSetAction(entry.id))}
              onCopyLastSession={() => run(() => copyLastSessionAction(entry.id))}
              onSelectVariant={(variantId) => run(() => selectVariantAction(entry.id, variantId))}
              onRemove={() => run(() => removeExerciseAction(entry.id))}
            />
          ))}
        </div>
      )}

      {workout.exercises.length > 0 ? (
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => setPickerOpen(true)}
          disabled={isPending}
        >
          <Plus className="size-5" aria-hidden />
          Ajouter un exercice
        </Button>
      ) : null}

      <Button
        variant="ghost"
        size="md"
        fullWidth
        onClick={abandon}
        disabled={isPending}
        className="text-fg-subtle hover:text-danger"
      >
        <Trash2 className="size-4" aria-hidden />
        Abandonner la séance
      </Button>

      {isPickerOpen ? (
        <ExercisePicker
          disabled={isPending}
          onClose={() => setPickerOpen(false)}
          onSelect={(exerciseId) => {
            setPickerOpen(false);
            run(() => addExerciseAction(workout.id, { exerciseId }));
          }}
        />
      ) : null}
    </div>
  );
}
