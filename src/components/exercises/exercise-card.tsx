import Link from "next/link";
import { ChevronRight, Settings2 } from "lucide-react";
import { FavoriteButton } from "./favorite-button";
import { Badge } from "@/components/ui/feedback";
import { formatRelativeDays } from "@/lib/date";
import { EXERCISE_CATEGORY_LABEL, MUSCLE_GROUP_LABEL } from "@/lib/labels";
import type { ExerciseSummary } from "@/server/services/exercise.service";

export function ExerciseCard({ exercise }: { exercise: ExerciseSummary }) {
  return (
    <div className="flex items-center gap-2 rounded-card border border-border bg-surface pr-2 transition-colors hover:border-border-strong">
      <Link
        href={`/exercises/${exercise.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{exercise.name}</p>
            {exercise.isCustom ? <Badge tone="accent">perso</Badge> : null}
            {exercise.isArchived ? <Badge>archivé</Badge> : null}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
            <span>{MUSCLE_GROUP_LABEL[exercise.muscleGroup]}</span>
            <span aria-hidden>·</span>
            <span>{EXERCISE_CATEGORY_LABEL[exercise.category]}</span>
            {exercise.variantCount > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Settings2 className="size-3" aria-hidden />
                  {exercise.variantCount} machine{exercise.variantCount > 1 ? "s" : ""}
                </span>
              </>
            ) : null}
            {exercise.lastPerformedAt ? (
              <>
                <span aria-hidden>·</span>
                <span>{formatRelativeDays(exercise.lastPerformedAt)}</span>
              </>
            ) : null}
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
      </Link>

      <FavoriteButton exerciseId={exercise.id} isFavorite={exercise.isFavorite} />
    </div>
  );
}
