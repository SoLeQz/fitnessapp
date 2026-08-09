import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/feedback";
import { PersonalRecordType } from "@/generated/prisma/enums";
import { formatSessionDate } from "@/lib/date";
import { formatVolume } from "@/lib/format";
import { PERSONAL_RECORD_LABEL } from "@/lib/labels";
import { formatWeight } from "@/lib/load-unit";
import { requireUserPage } from "@/server/auth/guard";
import { getAllRecords, type RecordEntry } from "@/server/services/analytics.service";

export const metadata: Metadata = { title: "Records" };

/** Affichage d'un record dans l'unité qui lui convient. */
function formatRecordValue(record: RecordEntry): string {
  switch (record.type) {
    case PersonalRecordType.MAX_WEIGHT:
      return record.weight !== null && record.weightUnit
        ? (formatWeight(record.weight, record.weightUnit) ?? "—")
        : formatVolume(record.value);
    case PersonalRecordType.MAX_REPS:
      return `${record.value} reps`;
    case PersonalRecordType.BEST_EST_1RM:
      return `${record.value} kg`;
    case PersonalRecordType.BEST_SET_VOLUME:
    case PersonalRecordType.BEST_SESSION_VOLUME:
      return formatVolume(record.value);
  }
}

export default async function RecordsPage() {
  const user = await requireUserPage();
  const records = await getAllRecords(user.id);

  // Regroupement par exercice et machine : un record sur la Matrix ne se
  // compare pas à un record sur la Technogym.
  const groups = new Map<string, { title: string; exerciseId: string; records: RecordEntry[] }>();
  for (const record of records) {
    const key = `${record.exercise.id}:${record.variantLabel ?? ""}`;
    const group = groups.get(key);
    if (group) group.records.push(record);
    else
      groups.set(key, {
        title: record.variantLabel
          ? `${record.exercise.name} · ${record.variantLabel}`
          : record.exercise.name,
        exerciseId: record.exercise.id,
        records: [record],
      });
  }

  const recent = [...records]
    .sort((a, b) => b.achievedAt.getTime() - a.achievedAt.getTime())
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title="Records"
        subtitle="Vos meilleures performances, calculées par exercice et par machine."
      />

      {records.length === 0 ? (
        <EmptyState
          title="Aucun record pour l'instant"
          description="Les records se calculent automatiquement à partir de vos séances terminées."
        />
      ) : (
        <>
          <Card className="mb-4">
            <CardBody>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Trophy className="size-4 text-warning" aria-hidden />
                Records récents
              </h2>
              <ul className="grid gap-1.5 md:grid-cols-2">
                {recent.map((record) => (
                  <li
                    key={record.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-bg-elevated px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {record.exercise.name}
                        {record.variantLabel ? (
                          <span className="text-fg-subtle"> · {record.variantLabel}</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-fg-subtle">
                        {PERSONAL_RECORD_LABEL[record.type]} ·{" "}
                        {formatSessionDate(record.achievedAt)}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-sm font-semibold">
                      {formatRecordValue(record)}
                      {record.type === PersonalRecordType.MAX_WEIGHT && record.reps
                        ? ` × ${record.reps}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            {[...groups.values()].map((group) => (
              <Card key={group.title}>
                <CardBody className="space-y-2">
                  <Link
                    href={`/exercises/${group.exerciseId}`}
                    className="text-sm font-semibold hover:text-accent"
                  >
                    {group.title}
                  </Link>
                  <ul className="space-y-1">
                    {group.records.map((record) => (
                      <li
                        key={record.id}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="text-fg-muted">
                          {PERSONAL_RECORD_LABEL[record.type]}
                        </span>
                        <span className="tabular font-medium">
                          {formatRecordValue(record)}
                          {record.type === PersonalRecordType.MAX_WEIGHT && record.reps
                            ? ` × ${record.reps}`
                            : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Badge>
                    dernier record {formatSessionDate(
                      group.records.reduce(
                        (latest, record) =>
                          record.achievedAt > latest ? record.achievedAt : latest,
                        group.records[0]!.achievedAt,
                      ),
                    )}
                  </Badge>
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
