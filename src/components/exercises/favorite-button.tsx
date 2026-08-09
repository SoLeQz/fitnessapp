"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { toggleFavoriteAction } from "@/app/(app)/exercises/actions";

/**
 * Bascule un favori. L'état visuel change immédiatement puis se réaligne sur le
 * serveur : en salle, l'application doit répondre sans attendre le réseau.
 */
export function FavoriteButton({
  exerciseId,
  isFavorite,
  className,
}: {
  exerciseId: string;
  isFavorite: boolean;
  className?: string;
}) {
  const [optimistic, setOptimistic] = useState(isFavorite);
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next = !optimistic;
    setOptimistic(next);
    startTransition(async () => {
      try {
        await toggleFavoriteAction(exerciseId, next);
      } catch {
        setOptimistic(!next);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={optimistic}
      aria-label={optimistic ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg transition-colors",
        optimistic ? "text-warning" : "text-fg-subtle hover:text-fg-muted",
        className,
      )}
    >
      <Star className={cn("size-4.5", optimistic && "fill-current")} aria-hidden />
    </button>
  );
}
