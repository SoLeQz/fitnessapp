import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createProgramAction } from "./actions";
import { PageHeader } from "@/components/layout/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/feedback";
import { requireUserPage } from "@/server/auth/guard";
import { listPrograms } from "@/server/services/program.service";

export const metadata: Metadata = { title: "Programmes" };

export default async function ProgramsPage() {
  const user = await requireUserPage();
  const programs = await listPrograms(user.id);

  return (
    <>
      <PageHeader
        title="Programmes"
        subtitle="Vos routines : démarrer une séance charge automatiquement les exercices du jour."
      />

      <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
        <div className="space-y-2">
          {programs.length === 0 ? (
            <Card>
              <CardBody className="text-sm text-fg-muted">
                Aucun programme pour l’instant. Créez-en un à droite, par exemple « Push Pull
                Legs », puis ajoutez-lui des jours.
              </CardBody>
            </Card>
          ) : (
            programs.map((program) => (
              <Link
                key={program.id}
                href={`/programs/${program.id}`}
                className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3.5 transition-colors hover:border-border-strong"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{program.name}</span>
                    {program.isArchived ? <Badge>archivé</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {program.dayCount} jour{program.dayCount > 1 ? "s" : ""} ·{" "}
                    {program.exerciseCount} exercice{program.exerciseCount > 1 ? "s" : ""}
                  </p>
                  {program.dayNames.length > 0 ? (
                    <p className="mt-1 truncate text-xs text-fg-subtle">
                      {program.dayNames.join(" · ")}
                    </p>
                  ) : null}
                </div>
                <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
              </Link>
            ))
          )}
        </div>

        <Card className="h-fit">
          <CardHeader title="Nouveau programme" />
          <CardBody className="pt-2">
            <ActionForm
              action={createProgramAction}
              submitLabel="Créer"
              pendingLabel="Création…"
              fields={[
                {
                  name: "name",
                  label: "Nom",
                  placeholder: "Push Pull Legs",
                  required: true,
                },
                {
                  name: "description",
                  label: "Description (facultatif)",
                  placeholder: "Trois séances par semaine",
                },
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
