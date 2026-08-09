"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { MUSCLE_GROUP_LABEL } from "@/lib/labels";
import { searchTerms } from "@/lib/text";
import type { MuscleGroup } from "@/generated/prisma/enums";

interface PickerExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  isFavorite: boolean;
}

/**
 * Sélecteur d'exercice pour ajouter un mouvement en cours de séance.
 * La liste est chargée une seule fois puis filtrée localement : en salle, le
 * réseau est souvent mauvais et la recherche doit rester instantanée.
 */
export function ExercisePicker({
  onSelect,
  onClose,
  disabled,
}: {
  onSelect: (exerciseId: string) => void;
  onClose: () => void;
  disabled: boolean;
}) {
  const [exercises, setExercises] = useState<PickerExercise[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/exercises", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Chargement impossible");
        const data = (await response.json()) as { exercises: PickerExercise[] };
        setExercises(data.exercises);
      })
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError("Impossible de charger la bibliothèque.");
      });
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    if (!exercises) return [];
    const terms = searchTerms(query);
    const matching =
      terms.length === 0
        ? exercises
        : exercises.filter((exercise) => {
            const haystack = searchTerms(exercise.name).join(" ");
            return terms.every((term) => haystack.includes(term));
          });

    // Les favoris remontent : ce sont les exercices que l'on ajoute le plus.
    return [...matching].sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite)).slice(0, 60);
  }, [exercises, query]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden
          />
          <TextInput
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un exercice…"
            aria-label="Rechercher un exercice"
            className="pl-9"
          />
        </div>
        <Button variant="ghost" size="lg" onClick={onClose} aria-label="Fermer">
          <X className="size-5" aria-hidden />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : exercises === null ? (
          <p className="text-sm text-fg-muted">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-fg-muted">Aucun exercice ne correspond.</p>
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((exercise) => (
              <li key={exercise.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(exercise.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-border-strong disabled:opacity-50"
                >
                  <span className="truncate text-sm font-medium">{exercise.name}</span>
                  <span className="shrink-0 text-xs text-fg-subtle">
                    {MUSCLE_GROUP_LABEL[exercise.muscleGroup]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
