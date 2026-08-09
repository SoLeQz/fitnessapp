import {
  differenceInCalendarDays,
  format,
  isSameDay,
  isToday,
  isYesterday,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";

/** « Aujourd'hui », « Hier », puis « 3 août » ou « 3 août 2025 » si autre année. */
export function formatSessionDate(date: Date, reference: Date = new Date()): string {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return "Hier";
  const sameYear = date.getFullYear() === reference.getFullYear();
  return format(date, sameYear ? "d MMMM" : "d MMMM yyyy", { locale: fr });
}

/** « lun. 3 août · 19:00 » */
export function formatSessionDateTime(date: Date): string {
  return format(date, "EEE d MMM · HH:mm", { locale: fr });
}

export function formatShortDate(date: Date): string {
  return format(date, "d MMM", { locale: fr });
}

export function formatIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatMonthLabel(date: Date): string {
  return format(date, "MMMM yyyy", { locale: fr });
}

/** « il y a 3 jours », borné aux cas utiles à l'application. */
export function formatRelativeDays(date: Date, reference: Date = new Date()): string {
  const days = differenceInCalendarDays(startOfDay(reference), startOfDay(date));
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  if (days < 14) return "il y a 1 semaine";
  if (days < 60) return `il y a ${Math.floor(days / 7)} semaines`;
  return `il y a ${Math.floor(days / 30)} mois`;
}

export { isSameDay, startOfDay };
