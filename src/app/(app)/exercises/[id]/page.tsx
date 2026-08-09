import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createVariantAction } from "../actions";
import { ProgressChart } from "@/components/charts/progress-chart";
import { ExerciseHistory, ProgressionBadge } from "@/components/exercises/exercise-history";
import { FavoriteButton } from "@/components/exercises/favorite-button";
import { VariantManager } from "@/components/exercises/variant-manager";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, StatTile } from "@/components/ui/feedback";
import { formatRelativeDays } from "@/lib/date";
import { formatVolume } from "@/lib/format";
import {
  EXERCISE_CATEGORY_LABEL,
  MUSCLE_GROUP_LABEL,
  TRACKING_MODE_LABEL,
} from "@/lib/labels";
import { formatWeight, unitLabel } from "@/lib/load-unit";
import { cn } from "@/lib/cn";
import { requireUserPage } from "@/server/auth/guard";
import { NotFoundError } from "@/server/errors";
import {
  getExerciseHistory,
  getExerciseStats,
  toProgressPoints,
} from "@/server/services/exercise-history.service";
import { getExercise } from "@/server/services/exercise.service";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ variant?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const user = await requireUserPage();
  const { id } = await params;
  try {
    const exercise = await getExercise(user.id, id);
    return { title: exercise.name };
  } catch {
    return { title: "Exercice" };
  }
}

export default async function ExerciseDetailPage({ params, searchParams }: PageProps) {
  const user = await requireUserPage();
  const { id } = await params;
  const { variant: variantParam } = await searchParams;

  let exercise;
  try {
    exercise = await getExercise(user.id, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  // Deux machines ne se comparent pas : dès qu'il en existe, l'historique est
  // filtré sur l'une d'elles, sans quoi les charges seraient mélangées.
  const activeVariants = exercise.variants.filter((entry) => !entry.isArchived);
  const selectedVariantId =
    variantParam && activeVariants.some((entry) => entry.id === variantParam)
      ? variantParam
      : variantParam === "none"
        ? null
        : (activeVariants.find((entry) => entry.isDefault)?.id ?? activeVariants[0]?.id ?? null);

  const scope = activeVariants.length > 0 ? selectedVariantId : undefined;

  const [sessions, stats] = await Promise.all([
    getExerciseHistory(user.id, exercise.id, scope),
    getExerciseStats(user.id, exercise.id, scope),
  ]);

  const points = toProgressPoints(sessions);
  const createAction = createVariantAction.bind(null, exercise.id);

  return (
    <>
      <Link
        href="/exercises"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Exercices
      </Link>

      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{exercise.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge>{MUSCLE_GROUP_LABEL[exercise.muscleGroup]}</Badge>
            <Badge>{EXERCISE_CATEGORY_LABEL[exercise.category]}</Badge>
            {exercise.isCustom ? <Badge tone="accent">exercice perso</Badge> : null}
            {exercise.lastPerformedAt ? (
              <span className="text-xs text-fg-muted">
                dernière fois {formatRelativeDays(exercise.lastPerformedAt)}
              </span>
            ) : null}
          </div>
        </div>
        <FavoriteButton exerciseId={exercise.id} isFavorite={exercise.isFavorite} />
      </header>

      {activeVariants.length > 0 ? (
        <nav aria-label="Machine" className="mb-4 flex flex-wrap gap-1.5">
          {activeVariants.map((entry) => (
            <Link
              key={entry.id}
              href={`/exercises/${exercise.id}?variant=${entry.id}`}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                selectedVariantId === entry.id
                  ? "border-accent/40 bg-accent-soft text-accent"
                  : "border-border bg-surface text-fg-muted hover:text-fg",
              )}
            >
              {entry.label}
            </Link>
          ))}
          <Link
            href={`/exercises/${exercise.id}?variant=none`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              selectedVariantId === null
                ? "border-accent/40 bg-accent-soft text-accent"
                : "border-border bg-surface text-fg-muted hover:text-fg",
            )}
          >
            Sans machine
          </Link>
        </nav>
      ) : null}

      {stats.progression ? (
        <Card className="mb-4">
          <CardBody className="py-3">
            <ProgressionBadge progression={stats.progression} />
          </CardBody>
        </Card>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile
          label="Charge max"
          value={formatWeight(stats.bestWeight, stats.unit) ?? "—"}
          tone="accent"
        />
        <StatTile label="Reps max" value={stats.bestReps ?? "—"} />
        <StatTile
          label="1RM estimé"
          value={
            stats.bestEstimatedOneRepMax !== null ? `${stats.bestEstimatedOneRepMax} kg` : "—"
          }
          hint={stats.bestEstimatedOneRepMax !== null ? "estimation, pas un objectif" : undefined}
        />
        <StatTile label="Volume total" value={formatVolume(stats.totalVolumeKg)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Progression"
            subtitle={`${stats.sessionCount} séance${stats.sessionCount > 1 ? "s" : ""} · ${stats.totalSets} séries`}
          />
          <CardBody className="pt-2">
            <ProgressChart points={points} unit={stats.unit} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Historique" subtitle="De la séance la plus récente à la plus ancienne" />
          <CardBody className="pt-2">
            <ExerciseHistory sessions={sessions} />
          </CardBody>
        </Card>

        <div className="space-y-4">
          {stats.repsByWeight.length > 0 ? (
            <Card>
              <CardHeader title="Meilleures répétitions par charge" />
              <CardBody className="pt-2">
                <ul className="space-y-1.5">
                  {stats.repsByWeight.map((entry) => (
                    <li
                      key={entry.weight}
                      className="tabular flex items-center justify-between rounded-lg bg-bg-elevated px-3 py-2 text-sm"
                    >
                      <span>{formatWeight(entry.weight, entry.unit)}</span>
                      <span className="font-medium">{entry.reps} reps</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Fiche" />
            <CardBody className="space-y-2.5 pt-2 text-sm">
              {exercise.description ? (
                <p className="text-fg-muted">{exercise.description}</p>
              ) : null}
              <dl className="space-y-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">Muscles secondaires</dt>
                  <dd className="text-right">
                    {exercise.secondaryMuscles.length > 0
                      ? exercise.secondaryMuscles
                          .map((muscle) => MUSCLE_GROUP_LABEL[muscle])
                          .join(", ")
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">Mesure</dt>
                  <dd>{TRACKING_MODE_LABEL[exercise.trackingMode]}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">Unité par défaut</dt>
                  <dd>{unitLabel(exercise.defaultUnit)}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Machines"
              subtitle="Une même charge n'a pas le même sens d'une machine à l'autre"
            />
            <CardBody className="pt-2">
              <VariantManager
                exerciseId={exercise.id}
                variants={exercise.variants}
                createAction={createAction}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
