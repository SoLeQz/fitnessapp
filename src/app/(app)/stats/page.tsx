import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { SimpleBarChart } from "@/components/charts/simple-bar-chart";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatTile } from "@/components/ui/feedback";
import { formatDuration, formatNumber, formatVolume } from "@/lib/format";
import { MUSCLE_GROUP_LABEL } from "@/lib/labels";
import { requireUserPage } from "@/server/auth/guard";
import { getGeneralStats } from "@/server/services/analytics.service";

export const metadata: Metadata = { title: "Statistiques" };

export default async function StatsPage() {
  const user = await requireUserPage();
  const stats = await getGeneralStats(user.id);

  const maxMuscleVolume = stats.volumeByMuscleGroup[0]?.volumeKg ?? 0;

  return (
    <>
      <PageHeader
        title="Statistiques"
        subtitle="Volume, fréquence et répartition de votre entraînement."
      />

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="Séances" value={formatNumber(stats.totalWorkouts)} tone="accent" />
        <StatTile label="Volume total" value={formatVolume(stats.totalVolumeKg)} />
        <StatTile label="Séries" value={formatNumber(stats.totalSets)} />
        <StatTile
          label="Durée moyenne"
          value={formatDuration(stats.averageDurationSeconds)}
          hint={
            stats.workoutsPerWeek !== null
              ? `${stats.workoutsPerWeek} séance(s)/semaine`
              : undefined
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Séances par semaine" subtitle="12 dernières semaines" />
          <CardBody className="pt-2">
            <SimpleBarChart
              data={stats.weeklyWorkouts.map((bucket) => ({
                label: bucket.label,
                value: bucket.count,
              }))}
              format="count"
              valueLabel="Séances"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Séances par mois" subtitle="12 derniers mois" />
          <CardBody className="pt-2">
            <SimpleBarChart
              data={stats.monthlyWorkouts.map((bucket) => ({
                label: bucket.label,
                value: bucket.count,
              }))}
              format="count"
              valueLabel="Séances"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Volume par mois" subtitle="Charge totale déplacée" />
          <CardBody className="pt-2">
            <SimpleBarChart
              data={stats.monthlyWorkouts.map((bucket) => ({
                label: bucket.label,
                value: Math.round(bucket.volumeKg),
              }))}
              format="volume"
              valueLabel="Volume"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Volume par groupe musculaire"
            subtitle="Seul le muscle principal de chaque exercice est compté"
          />
          <CardBody className="space-y-2 pt-2">
            {stats.volumeByMuscleGroup.length === 0 ? (
              <p className="text-sm text-fg-muted">Pas encore de données.</p>
            ) : (
              stats.volumeByMuscleGroup.map((row) => (
                <div key={row.muscleGroup}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span>{MUSCLE_GROUP_LABEL[row.muscleGroup]}</span>
                    <span className="tabular text-xs text-fg-muted">
                      {formatVolume(row.volumeKg)} · {row.sets} séries
                    </span>
                  </div>
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-bg-elevated"
                    role="presentation"
                  >
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{
                        width: `${maxMuscleVolume > 0 ? (row.volumeKg / maxMuscleVolume) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Exercices les plus utilisés" />
          <CardBody className="pt-2">
            {stats.topExercises.length === 0 ? (
              <p className="text-sm text-fg-muted">Pas encore de données.</p>
            ) : (
              <ul className="grid gap-1.5 md:grid-cols-2">
                {stats.topExercises.map((exercise) => (
                  <li key={exercise.id}>
                    <Link
                      href={`/exercises/${exercise.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl bg-bg-elevated px-3 py-2 transition-colors hover:bg-surface-hover"
                    >
                      <span className="truncate text-sm">{exercise.name}</span>
                      <span className="tabular shrink-0 text-xs text-fg-muted">
                        {exercise.sessionCount} séances
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
