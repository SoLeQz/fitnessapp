import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { addDayAction } from "../actions";
import { PageHeader } from "@/components/layout/page-header";
import { ProgramEditor } from "@/components/programs/program-editor";
import { ActionForm } from "@/components/ui/action-form";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { requireUserPage } from "@/server/auth/guard";
import { NotFoundError } from "@/server/errors";
import { getProgram } from "@/server/services/program.service";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const user = await requireUserPage();
  const { id } = await params;
  try {
    const program = await getProgram(user.id, id);
    return { title: program.name };
  } catch {
    return { title: "Programme" };
  }
}

export default async function ProgramDetailPage({ params }: PageProps) {
  const user = await requireUserPage();
  const { id } = await params;

  let program;
  try {
    program = await getProgram(user.id, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const addDay = addDayAction.bind(null, program.id);

  return (
    <>
      <Link
        href="/programs"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Programmes
      </Link>

      <PageHeader title={program.name} subtitle={program.description ?? undefined} />

      <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
        <ProgramEditor initialProgram={program} />

        <Card className="h-fit">
          <CardHeader title="Ajouter un jour" subtitle="Push, Pull, Legs, Haut du corps…" />
          <CardBody className="pt-2">
            <ActionForm
              action={addDay}
              submitLabel="Ajouter le jour"
              pendingLabel="Ajout…"
              fields={[{ name: "name", label: "Nom du jour", placeholder: "Push", required: true }]}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
