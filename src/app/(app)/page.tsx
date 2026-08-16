import type { Metadata } from "next";
import Link from "next/link";
import { Timer, Trophy } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StartWorkoutButton } from "@/components/workout/start-workout-button";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, StatTile } from "@/components/ui/feedback";
import { ShootingStars } from "@/components/ui/shooting-stars";
import { formatRelativeDays, formatSessionDate } from "@/lib/date";
import { formatDuration, formatVolume } from "@/lib/format";
import { formatWeight } from "@/lib/load-unit";
import { requireUserPage } from "@/server/auth/guard";
import { getDashboardSummary } from "@/server/services/analytics.service";
import { getActiveWorkout } from "@/server/services/workout.service";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const user = await requireUserPage();
  const [activeWorkout, summary] = await Promise.all([
    getActiveWorkout(user.id),
    getDashboardSummary(user.id),
  ]);

  return (
    <>
      <ShootingStars />

      <PageHeader
        title={`Bonjour ${user.displayName}`}
        subtitle={
          summary.nextProgramDay
            ? `Prochaine séance prévue : ${summary.nextProgramDay.name} · ${summary.nextProgramDay.programName}`
            : "Prêt pour la séance ?"
        }
      />

      {activeWorkout ? (
        <Card className="mb-4 border-accent/40">
          <CardHeader
            title="Séance en cours"
            subtitle={`${activeWorkout.name} · démarrée ${formatSessionDate(activeWorkout.startedAt)}`}
          />
          <CardBody className="pt-2">
            <Link
              href="/workout/active"
              className={buttonClassName({ variant: "primary", size: "xl", fullWidth: true })}
            >
              <Timer className="size-5" aria-hidden />
              Reprendre la séance
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="mb-4 space-y-2">
          {summary.nextProgramDay ? (
            <StartWorkoutButton
              label={`Démarrer ${summary.nextProgramDay.name}`}
              programDayId={summary.nextProgramDay.id}
            />
          ) : null}
          <StartWorkoutButton
            label="Démarrer une séance libre"
            name="Séance libre"
            variant={summary.nextProgramDay ? "secondary" : "primary"}
            size={summary.nextProgramDay ? "lg" : "xl"}
          />
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="Cette semaine" value={summary.workoutsThisWeek} tone="accent" hint="séances" />
        <StatTile label="Ce mois-ci" value={summary.workoutsThisMonth} hint="séances" />
        <StatTile label="Volume total" value={formatVolume(summary.totalVolumeKg)} />
        <StatTile
          label="Temps en salle"
          value={formatDuration(summary.totalTrainingSeconds)}
          hint={
            summary.averageDurationSeconds
              ? `${formatDuration(summary.averageDurationSeconds)} en moyenne`
              : undefined
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader
            title="Dernière séance"
            action={
              summary.lastWorkout ? (
                <Link
                  href={`/workouts/${summary.lastWorkout.id}`}
                  className="text-xs font-medium text-accent hover:text-accent-hover"
                >
                  Détail
                </Link>
              ) : null
            }
          />
          <CardBody className="pt-2">
            {summary.lastWorkout ? (
              <div className="space-y-3">
                <div>
                  <p className="font-medium">{summary.lastWorkout.name}</p>
                  <p className="text-xs text-fg-muted">
                    {formatSessionDate(summary.lastWorkout.startedAt)} ·{" "}
                    {summary.lastWorkout.totalSets} séries ·{" "}
                    {formatVolume(summary.lastWorkout.totalVolumeKg)} ·{" "}
                    {formatDuration(summary.lastWorkout.durationSeconds)}
                  </p>
                </div>

                {summary.lastWorkout.exerciseNames.length > 0 ? (
                  <p className="text-xs text-fg-subtle">
                    {summary.lastWorkout.exerciseNames.join(" · ")}
                  </p>
                ) : null}

                {!activeWorkout ? (
                  <StartWorkoutButton
                    label={`Refaire ${summary.lastWorkout.name}`}
                    name={summary.lastWorkout.name}
                    variant="secondary"
                    size="md"
                  />
                ) : null}
              </div>
            ) : (
              <EmptyState
                title="Aucune séance terminée"
                description="Votre première séance apparaîtra ici."
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Records récents"
            action={
              <Link
                href="/records"
                className="text-xs font-medium text-accent hover:text-accent-hover"
              >
                Tous
              </Link>
            }
          />
          <CardBody className="pt-2">
            {summary.recentRecords.length === 0 ? (
              <p className="text-sm text-fg-muted">
                Vos records apparaîtront après quelques séances.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {summary.recentRecords.map((record) => (
                  <li
                    key={record.id}
                    className="flex items-center gap-3 rounded-xl bg-bg-elevated px-3 py-2"
                  >
                    <Trophy className="size-4 shrink-0 text-warning" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {record.exercise.name}
                        {record.variantLabel ? (
                          <span className="text-fg-subtle"> · {record.variantLabel}</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-fg-subtle">
                        {formatRelativeDays(record.achievedAt)}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-sm font-semibold">
                      {record.weight !== null && record.weightUnit
                        ? `${formatWeight(record.weight, record.weightUnit)}${record.reps ? ` × ${record.reps}` : ""}`
                        : formatVolume(record.value)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader title="Exercices les plus pratiqués" />
          <CardBody className="pt-2">
            {summary.topExercises.length === 0 ? (
              <p className="text-sm text-fg-muted">Rien à afficher pour l’instant.</p>
            ) : (
              <ul className="grid gap-1.5 md:grid-cols-2">
                {summary.topExercises.map((exercise) => (
                  <li key={exercise.id}>
                    <Link
                      href={`/exercises/${exercise.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl bg-bg-elevated px-3 py-2 transition-colors hover:bg-surface-hover"
                    >
                      <span className="truncate text-sm">{exercise.name}</span>
                      <span className="tabular shrink-0 text-xs text-fg-muted">
                        {exercise.sessionCount} séance{exercise.sessionCount > 1 ? "s" : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
