import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatMonthLabel } from "@/lib/date";
import { formatVolume } from "@/lib/format";
import { requireUserPage } from "@/server/auth/guard";
import { getCalendarMonth, toDateKey } from "@/server/services/analytics.service";

export const metadata: Metadata = { title: "Calendrier" };

const WEEK_OPTIONS = { weekStartsOn: 1 as const, locale: fr };
const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

/** `?month=yyyy-MM`, ou le mois courant si absent ou illisible. */
function parseMonth(raw: string | undefined): Date {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [year, month] = raw.split("-").map(Number);
    if (year && month && month >= 1 && month <= 12) return new Date(year, month - 1, 1);
  }
  return startOfMonth(new Date());
}

function toMonthParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUserPage();
  const { month: monthParam } = await searchParams;
  const month = parseMonth(monthParam);

  const workoutsByDay = await getCalendarMonth(user.id, month);

  // La grille couvre des semaines entières pour rester alignée sur les colonnes.
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), WEEK_OPTIONS),
    end: endOfWeek(endOfMonth(month), WEEK_OPTIONS),
  });

  const monthWorkouts = [...workoutsByDay.values()].flat();

  return (
    <>
      <PageHeader
        title="Calendrier"
        subtitle={`${monthWorkouts.length} séance${monthWorkouts.length > 1 ? "s" : ""} ce mois-ci`}
      />

      <Card>
        <CardBody>
          <div className="mb-4 flex items-center justify-between gap-3">
            <Link
              href={`/calendar?month=${toMonthParam(subMonths(month, 1))}`}
              aria-label="Mois précédent"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-fg-muted transition-colors hover:text-fg"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Link>

            <h2 className="text-sm font-semibold capitalize">{formatMonthLabel(month)}</h2>

            <Link
              href={`/calendar?month=${toMonthParam(addMonths(month, 1))}`}
              aria-label="Mois suivant"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-fg-muted transition-colors hover:text-fg"
            >
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((label, index) => (
              <div
                key={`${label}-${index}`}
                className="pb-1 text-center text-[11px] font-medium text-fg-subtle"
              >
                {label}
              </div>
            ))}

            {days.map((day) => {
              const key = toDateKey(day);
              const workouts = workoutsByDay.get(key) ?? [];
              const inMonth = isSameMonth(day, month);
              const first = workouts[0];

              const cell = (
                <div
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border p-1 text-center transition-colors",
                    workouts.length > 0
                      ? "border-accent/40 bg-accent-soft"
                      : "border-border bg-bg-elevated",
                    !inMonth && "opacity-35",
                    isToday(day) && "ring-1 ring-fg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "tabular text-xs",
                      workouts.length > 0 ? "font-semibold text-accent" : "text-fg-muted",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {first ? (
                    <span className="line-clamp-1 text-[9px] leading-tight text-fg-muted">
                      {first.name}
                    </span>
                  ) : null}
                  {workouts.length > 1 ? (
                    <span className="text-[9px] text-fg-subtle">+{workouts.length - 1}</span>
                  ) : null}
                </div>
              );

              return first ? (
                <Link key={key} href={`/workouts/${first.id}`} className="contents">
                  {cell}
                </Link>
              ) : (
                <div key={key}>{cell}</div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {monthWorkouts.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {[...workoutsByDay.entries()]
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([dayKey, workouts]) =>
              workouts.map((workout) => (
                <li key={workout.id}>
                  <Link
                    href={`/workouts/${workout.id}`}
                    className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3 transition-colors hover:border-border-strong"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{workout.name}</p>
                      <p className="text-xs text-fg-muted">{dayKey}</p>
                    </div>
                    <span className="tabular shrink-0 text-xs text-fg-muted">
                      {workout.totalSets} séries · {formatVolume(workout.totalVolumeKg)}
                    </span>
                  </Link>
                </li>
              )),
            )}
        </ul>
      ) : null}
    </>
  );
}
