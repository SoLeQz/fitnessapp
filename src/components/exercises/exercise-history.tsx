import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui/feedback";
import { formatSessionDate } from "@/lib/date";
import { formatVolume } from "@/lib/format";
import { formatWeight } from "@/lib/load-unit";
import { PROGRESSION_INDICATOR, type ProgressionComparison } from "@/lib/progression";
import type { HistorySession } from "@/server/services/exercise-history.service";

/** Pastille de progression : 🟢 / 🟡 / 🔴 avec l'écart en clair. */
export function ProgressionBadge({ progression }: { progression: ProgressionComparison | null }) {
  if (!progression) return null;

  const indicator = PROGRESSION_INDICATOR[progression.status];
  const tone =
    progression.status === "up" ? "success" : progression.status === "down" ? "danger" : "warning";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={tone}>
        <span aria-hidden>{indicator.emoji}</span>
        {indicator.label}
      </Badge>
      <span className="tabular text-sm font-medium">{progression.summary}</span>
      <span className="text-xs text-fg-subtle">
        {formatWeight(progression.previous.weight, progression.previous.weightUnit)} ×{" "}
        {progression.previous.reps} → {""}
        {formatWeight(progression.current.weight, progression.current.weightUnit)} ×{" "}
        {progression.current.reps}
      </span>
    </div>
  );
}

/**
 * Historique séance par séance. C'est l'écran que l'on ouvre devant la machine
 * pour savoir quelle charge mettre : les séries sont donc listées telles
 * qu'elles ont été réalisées, sans agrégation.
 */
export function ExerciseHistory({ sessions }: { sessions: HistorySession[] }) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        title="Aucune séance enregistrée"
        description="L'historique apparaîtra dès que vous aurez travaillé cet exercice."
      />
    );
  }

  return (
    <ol className="space-y-3">
      {sessions.map((session) => (
        <li key={`${session.workoutId}-${session.variant?.id ?? "none"}`}>
          <div className="rounded-xl border border-border bg-bg-elevated p-3.5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/workouts/${session.workoutId}`}
                  className="text-sm font-medium hover:text-accent"
                >
                  {formatSessionDate(session.performedAt)}
                </Link>
                {session.variant ? <Badge tone="accent">{session.variant.label}</Badge> : null}
              </div>
              <span className="tabular text-xs text-fg-muted">
                {session.volumeKg > 0 ? formatVolume(session.volumeKg) : `${session.totalReps} reps`}
                {session.estimatedOneRepMax !== null
                  ? ` · 1RM ~${session.estimatedOneRepMax} kg`
                  : ""}
              </span>
            </div>

            <ul className="space-y-1">
              {session.sets
                .filter((set) => set.isCompleted)
                .map((set) => (
                  <li key={set.id} className="tabular flex items-center gap-3 text-sm">
                    <span className="w-4 text-xs text-fg-subtle">{set.setNumber}</span>
                    <span>
                      {[
                        formatWeight(set.weight, set.weightUnit),
                        set.reps !== null ? `${set.reps} reps` : null,
                        set.durationSeconds !== null ? `${set.durationSeconds}s` : null,
                        set.distanceMeters !== null ? `${set.distanceMeters} m` : null,
                      ]
                        .filter(Boolean)
                        .join(" × ")}
                    </span>
                    {set.isWarmup ? (
                      <span className="text-xs text-fg-subtle">échauffement</span>
                    ) : null}
                  </li>
                ))}
            </ul>
          </div>
        </li>
      ))}
    </ol>
  );
}
