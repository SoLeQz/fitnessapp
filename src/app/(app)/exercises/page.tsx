import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ExerciseCard } from "@/components/exercises/exercise-card";
import { ExerciseFilters } from "@/components/exercises/exercise-filters";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { MUSCLE_GROUP_LABEL } from "@/lib/labels";
import { requireUserPage } from "@/server/auth/guard";
import { listExercises } from "@/server/services/exercise.service";
import { exerciseFiltersSchema } from "@/server/validation/exercise";

export const metadata: Metadata = { title: "Exercices" };

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUserPage();
  const raw = await searchParams;

  // Les filtres viennent de l'URL : ils sont validés comme n'importe quelle
  // entrée externe avant d'atteindre le service.
  const filters = exerciseFiltersSchema.parse({
    query: typeof raw["query"] === "string" ? raw["query"] : undefined,
    muscleGroup: typeof raw["muscleGroup"] === "string" ? raw["muscleGroup"] : undefined,
    category: typeof raw["category"] === "string" ? raw["category"] : undefined,
    favoritesOnly: raw["favoritesOnly"] === "true" ? "true" : undefined,
    mineOnly: raw["mineOnly"] === "true" ? "true" : undefined,
  });

  const exercises = await listExercises(user.id, filters);

  // Regroupement par groupe musculaire : c'est ainsi qu'on cherche un exercice
  // quand on prépare une séance.
  const grouped = new Map<string, typeof exercises>();
  for (const exercise of exercises) {
    const key = exercise.muscleGroup;
    const bucket = grouped.get(key);
    if (bucket) bucket.push(exercise);
    else grouped.set(key, [exercise]);
  }

  return (
    <>
      <PageHeader
        title="Exercices"
        subtitle={`${exercises.length} exercice${exercises.length > 1 ? "s" : ""}`}
        action={
          <Link
            href="/exercises/new"
            className={buttonClassName({
              variant: "primary",
              className: "hidden md:inline-flex",
            })}
          >
            <Plus className="size-4" aria-hidden />
            Nouvel exercice
          </Link>
        }
      />

      <div className="space-y-5">
        <ExerciseFilters />

        {exercises.length === 0 ? (
          <EmptyState
            title="Aucun exercice ne correspond"
            description="Modifiez les filtres, ou créez l'exercice qui manque à votre salle."
            action={
              <Link
                href="/exercises/new"
                className="text-sm font-medium text-accent hover:text-accent-hover"
              >
                Créer un exercice
              </Link>
            }
          />
        ) : (
          [...grouped.entries()].map(([muscleGroup, items]) => (
            <section key={muscleGroup}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                {MUSCLE_GROUP_LABEL[muscleGroup as keyof typeof MUSCLE_GROUP_LABEL]}
              </h2>
              <div className="space-y-2">
                {items.map((exercise) => (
                  <ExerciseCard key={exercise.id} exercise={exercise} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Action principale toujours atteignable au pouce sur mobile. */}
      <Link
        href="/exercises/new"
        className="fixed bottom-24 right-4 z-30 inline-flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg shadow-accent/20 md:hidden"
        aria-label="Nouvel exercice"
      >
        <Plus className="size-6" aria-hidden />
      </Link>
    </>
  );
}
