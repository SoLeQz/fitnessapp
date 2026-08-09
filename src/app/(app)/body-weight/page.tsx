import type { Metadata } from "next";
import { recordBodyWeightAction } from "./actions";
import { PageHeader } from "@/components/layout/page-header";
import { BodyWeightChart } from "@/components/charts/body-weight-chart";
import { ActionForm } from "@/components/ui/action-form";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, StatTile } from "@/components/ui/feedback";
import { LoadUnit } from "@/generated/prisma/enums";
import { formatSessionDate } from "@/lib/date";
import { fromKilograms, unitLabel, unitSuffix } from "@/lib/load-unit";
import { requireUserPage } from "@/server/auth/guard";
import { getBodyWeightSummary } from "@/server/services/body-weight.service";

export const metadata: Metadata = { title: "Poids corporel" };

/** Écart signé lisible : « +0.4 kg », « −1.2 kg », « — ». */
function formatDelta(deltaKg: number | null, unit: LoadUnit): string {
  if (deltaKg === null) return "—";
  const converted = fromKilograms(Math.abs(deltaKg), unit) ?? Math.abs(deltaKg);
  if (converted === 0) return "=";
  const rounded = Math.round(converted * 10) / 10;
  return `${deltaKg > 0 ? "+" : "−"}${rounded} ${unitSuffix(unit)}`;
}

export default async function BodyWeightPage() {
  const user = await requireUserPage();
  const summary = await getBodyWeightSummary(user.id);
  const unit = user.preferredUnit;

  const points = [...summary.entries]
    .reverse()
    .map((entry) => ({
      timestamp: entry.measuredOn.getTime(),
      value: Math.round((fromKilograms(entry.weightKg, unit) ?? entry.weightKg) * 10) / 10,
    }));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="Poids corporel" subtitle="Une pesée par jour, corrigeable à tout moment." />

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile
          label="Poids actuel"
          value={
            summary.current
              ? `${Math.round((fromKilograms(summary.current.weightKg, unit) ?? 0) * 10) / 10} ${unitSuffix(unit)}`
              : "—"
          }
          tone="accent"
          hint={summary.current ? formatSessionDate(summary.current.measuredOn) : undefined}
        />
        <StatTile
          label="7 jours"
          value={formatDelta(summary.change7Days, unit)}
          tone={
            summary.change7Days === null
              ? "neutral"
              : summary.change7Days > 0
                ? "warning"
                : "success"
          }
        />
        <StatTile label="30 jours" value={formatDelta(summary.change30Days, unit)} />
        <StatTile label="Depuis le début" value={formatDelta(summary.changeTotal, unit)} />
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Évolution"
              subtitle={
                summary.highest && summary.lowest
                  ? `Max ${Math.round((fromKilograms(summary.highest.weightKg, unit) ?? 0) * 10) / 10} ${unitSuffix(unit)} · Min ${Math.round((fromKilograms(summary.lowest.weightKg, unit) ?? 0) * 10) / 10} ${unitSuffix(unit)}`
                  : undefined
              }
            />
            <CardBody className="pt-2">
              <BodyWeightChart points={points} unitSuffix={unitSuffix(unit)} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Historique des pesées" />
            <CardBody className="pt-2">
              {summary.entries.length === 0 ? (
                <EmptyState
                  title="Aucune pesée"
                  description="Enregistrez votre première pesée pour suivre son évolution."
                />
              ) : (
                <ul className="space-y-1">
                  {summary.entries.slice(0, 30).map((entry) => (
                    <li
                      key={entry.id}
                      className="tabular flex items-center justify-between gap-3 rounded-lg bg-bg-elevated px-3 py-2 text-sm"
                    >
                      <span className="text-fg-muted">
                        {formatSessionDate(entry.measuredOn)}
                      </span>
                      <span className="font-medium">
                        {Math.round((fromKilograms(entry.weightKg, unit) ?? 0) * 10) / 10}{" "}
                        {unitSuffix(unit)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Nouvelle pesée" />
          <CardBody className="pt-2">
            <ActionForm
              action={recordBodyWeightAction}
              submitLabel="Enregistrer"
              pendingLabel="Enregistrement…"
              fields={[
                {
                  name: "weight",
                  label: "Poids",
                  type: "number",
                  inputMode: "decimal",
                  step: 0.1,
                  min: 20,
                  max: 700,
                  required: true,
                  ...(summary.current
                    ? {
                        defaultValue:
                          Math.round((fromKilograms(summary.current.weightKg, unit) ?? 0) * 10) /
                          10,
                      }
                    : {}),
                },
                {
                  name: "unit",
                  label: "Unité",
                  defaultValue: unit,
                  options: [
                    { value: LoadUnit.KG, label: unitLabel(LoadUnit.KG) },
                    { value: LoadUnit.LBS, label: unitLabel(LoadUnit.LBS) },
                  ],
                },
                {
                  name: "measuredOn",
                  label: "Date",
                  type: "date",
                  defaultValue: today,
                  hint: "Une seule pesée par jour : ressaisir corrige la valeur.",
                  required: true,
                },
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
