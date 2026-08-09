import {
  BarChart3,
  CalendarDays,
  Dumbbell,
  History,
  Home,
  ListChecks,
  Scale,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";

export interface NavItem {
  href: Route;
  label: string;
  icon: LucideIcon;
  /** Présent dans la barre inférieure mobile (limitée à cinq entrées). */
  primary?: boolean;
}

/**
 * Source unique de la navigation : la barre latérale desktop affiche tout,
 * la barre inférieure mobile ne garde que les entrées `primary`.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Accueil", icon: Home, primary: true },
  { href: "/exercises", label: "Exercices", icon: Dumbbell, primary: true },
  { href: "/workouts", label: "Séances", icon: History, primary: true },
  { href: "/programs", label: "Programmes", icon: ListChecks },
  { href: "/stats", label: "Statistiques", icon: BarChart3, primary: true },
  { href: "/records", label: "Records", icon: Trophy },
  { href: "/calendar", label: "Calendrier", icon: CalendarDays },
  { href: "/body-weight", label: "Poids", icon: Scale },
  { href: "/profile", label: "Profil", icon: User, primary: true },
];

/** Une entrée est active pour sa page et ses sous-pages. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
