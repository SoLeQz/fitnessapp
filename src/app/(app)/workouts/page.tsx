import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, EmptyState } from "@/components/ui/feedback";
import { WorkoutStatus } from "@/generated/prisma/enums";
import { formatSessionDate } from "@/lib/date";
import { formatDuration, formatVolume } from "@/lib/format";
import { requireUserPage } from "@/server/auth/guard";
import { listWorkouts } from "@/server/services/workout.service";

export const metadata: Metadata = { title: "Séances" };

export default async function WorkoutsPage() {
  const user = await requireUserPage();
  const workouts = await listWorkouts(user.id, { limit: 60 });

  return (
    <>
      <PageHeader
        title="Séances"
        subtitle={`${workouts.length} séance${workouts.length > 1 ? "s" : ""} enregistrée${workouts.length > 1 ? "s" : ""}`}
      />

      {workouts.length === 0 ? (
        <EmptyState
          title="Aucune séance pour l’instant"
          description="Démarrez votre première séance depuis l'accueil."
          action={
            <Link href="/" className="text-sm font-medium text-accent hover:text-accent-hover">
              Aller à l’accueil
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {workouts.map((workout) => (
            <li key={workout.id}>
              <Link
                href={`/workouts/${workout.id}`}
                className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3.5 transition-colors hover:border-border-strong"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{workout.name}</span>
                    {workout.status === WorkoutStatus.IN_PROGRESS ? (
                      <Badge tone="accent">en cours</Badge>
                    ) : null}
                  </div>

                  <p className="mt-0.5 text-xs text-fg-muted">
                    {formatSessionDate(workout.startedAt)}
                    {workout.durationSeconds !== null
                      ? ` · ${formatDuration(workout.durationSeconds)}`
                      : ""}
                    {` · ${workout.totalSets} série${workout.totalSets > 1 ? "s" : ""}`}
                    {workout.totalVolumeKg > 0
                      ? ` · ${formatVolume(workout.totalVolumeKg)}`
                      : ""}
                  </p>

                  {workout.exerciseNames.length > 0 ? (
                    <p className="mt-1 truncate text-xs text-fg-subtle">
                      {workout.exerciseNames.join(" · ")}
                    </p>
                  ) : null}
                </div>

                <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
