"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Timer } from "lucide-react";

/**
 * Rappel permanent qu'une séance est ouverte. Sans lui, quitter l'écran de
 * séance pour consulter un historique donne l'impression d'avoir tout perdu —
 * alors que chaque série est déjà enregistrée.
 */
export function ResumeWorkoutBanner({ workoutName }: { workoutName: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/workout/active")) return null;

  return (
    <Link
      href="/workout/active"
      className="mb-4 flex items-center gap-3 rounded-card border border-accent/40 bg-accent-soft px-4 py-3 transition-colors hover:bg-accent/15"
    >
      <Timer className="size-4 shrink-0 animate-pulse-soft text-accent" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm">
        <span className="font-medium text-accent">Séance en cours</span>
        <span className="text-fg-muted"> · {workoutName}</span>
      </span>
      <span className="shrink-0 text-xs font-medium text-accent">Reprendre</span>
    </Link>
  );
}
