import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createExerciseAction } from "../actions";
import { PageHeader } from "@/components/layout/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { Card, CardBody } from "@/components/ui/card";
import { LoadUnit, TrackingMode } from "@/generated/prisma/enums";
import {
  EXERCISE_CATEGORY_OPTIONS,
  MUSCLE_GROUP_OPTIONS,
  TRACKING_MODE_OPTIONS,
} from "@/lib/labels";
import { unitLabel } from "@/lib/load-unit";
import { requireUserPage } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Nouvel exercice" };

export default async function NewExercisePage() {
  const user = await requireUserPage();

  return (
    <>
      <Link
        href="/exercises"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Exercices
      </Link>

      <PageHeader
        title="Nouvel exercice"
        subtitle="Pour une machine particulière de votre salle, ou un mouvement absent du catalogue."
      />

      <Card className="max-w-xl">
        <CardBody>
          <ActionForm
            action={createExerciseAction}
            submitLabel="Créer l'exercice"
            pendingLabel="Création…"
            fields={[
              {
                name: "name",
                label: "Nom",
                placeholder: "Chest Press convergente",
                required: true,
              },
              {
                name: "muscleGroup",
                label: "Groupe musculaire",
                options: MUSCLE_GROUP_OPTIONS,
                required: true,
              },
              {
                name: "category",
                label: "Matériel",
                options: EXERCISE_CATEGORY_OPTIONS,
                required: true,
              },
              {
                name: "trackingMode",
                label: "Ce qui est mesuré",
                defaultValue: TrackingMode.WEIGHT_REPS,
                hint: "Détermine les champs proposés pendant la séance.",
                options: TRACKING_MODE_OPTIONS,
              },
              {
                name: "defaultUnit",
                label: "Unité de charge",
                defaultValue: user.preferredUnit,
                hint: "Une machine graduée en niveaux se configure ensuite en variante.",
                options: [
                  { value: LoadUnit.KG, label: unitLabel(LoadUnit.KG) },
                  { value: LoadUnit.LBS, label: unitLabel(LoadUnit.LBS) },
                  { value: LoadUnit.LEVEL, label: unitLabel(LoadUnit.LEVEL) },
                  { value: LoadUnit.BODYWEIGHT, label: unitLabel(LoadUnit.BODYWEIGHT) },
                  { value: LoadUnit.NONE, label: unitLabel(LoadUnit.NONE) },
                ],
              },
              {
                name: "description",
                label: "Description (facultatif)",
                placeholder: "Réglage du siège, prise, remarques…",
              },
            ]}
          />
        </CardBody>
      </Card>
    </>
  );
}
