import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Timer } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, StatTile } from "@/components/ui/feedback";
import { WorkoutStatus } from "@/generated/prisma/enums";
import { formatSessionDateTime } from "@/lib/date";
import { formatClock, formatDuration, formatVolume } from "@/lib/format";
import { formatWeight } from "@/lib/load-unit";
import { requireUserPage } from "@/server/auth/guard";
import { NotFoundError } from "@/server/errors";
import { getWorkout } from "@/server/services/workout.service";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const user = await requireUserPage();
  const { id } = await params;
  try {
    const workout = await getWorkout(user.id, id);
    return { title: workout.name };
  } catch {
    return { title: "Séance" };
  }
}

export default async function WorkoutDetailPage({ params }: PageProps) {
  const user = await requireUserPage();
  const { id } = await params;

  let workout;
  try {
    workout = await getWorkout(user.id, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <>
      <Link
        href="/workouts"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Séances
      </Link>

      <PageHeader
        title={workout.name}
        subtitle={formatSessionDateTime(workout.startedAt)}
        action={
          workout.status === WorkoutStatus.IN_PROGRESS ? (
            <Link href="/workout/active" className={buttonClassName({ variant: "primary" })}>
              <Timer className="size-4" aria-hidden />
              Reprendre
            </Link>
          ) : null
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-2">
        <StatTile label="Volume" value={formatVolume(workout.totalVolumeKg)} />
        <StatTile label="Séries" value={workout.totalSets} />
        <StatTile label="Durée" value={formatDuration(workout.durationSeconds)} />
      </div>

      {workout.notes ? (
        <Card className="mb-4">
          <CardBody className="text-sm text-fg-muted">{workout.notes}</CardBody>
        </Card>
      ) : null}

      <div className="space-y-3">
        {workout.exercises.map((entry) => (
          <Card key={entry.id}>
            <CardBody className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/exercises/${entry.exercise.id}`}
                  className="font-medium hover:text-accent"
                >
                  {entry.exercise.name}
                </Link>
                {entry.variant ? <Badge tone="accent">{entry.variant.label}</Badge> : null}
              </div>

              <ul className="space-y-1">
                {entry.sets.map((set) => {
                  const measures = [
                    formatWeight(set.weight, set.weightUnit),
                    set.reps !== null ? `${set.reps} reps` : null,
                    set.durationSeconds !== null ? formatClock(set.durationSeconds) : null,
                    set.distanceMeters !== null ? `${set.distanceMeters} m` : null,
                  ].filter(Boolean);

                  return (
                    <li
                      key={set.id}
                      className="tabular flex items-center gap-3 rounded-lg bg-bg-elevated px-3 py-1.5 text-sm"
                    >
                      <span className="w-5 text-xs text-fg-subtle">{set.setNumber}</span>
                      <span className="flex-1">{measures.join(" × ") || "—"}</span>
                      {set.isWarmup ? (
                        <span className="text-xs text-fg-subtle">échauffement</span>
                      ) : null}
                      {set.restSeconds !== null ? (
                        <span className="text-xs text-fg-subtle">{set.restSeconds}s</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              {entry.notes ? <p className="text-xs text-fg-muted">{entry.notes}</p> : null}
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
