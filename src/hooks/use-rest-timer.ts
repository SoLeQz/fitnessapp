"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RestTimerState {
  /** Instant de fin (epoch ms) quand le timer tourne. */
  endsAt: number | null;
  /** Secondes restantes quand il est en pause. */
  pausedRemaining: number | null;
  /** Durée initialement demandée, pour la réinitialisation. */
  totalSeconds: number;
  label: string | null;

  start: (seconds: number, label?: string) => void;
  pause: () => void;
  resume: () => void;
  adjust: (deltaSeconds: number) => void;
  reset: () => void;
  stop: () => void;
}

/** Bornes du timer : au-delà, il ne s'agit plus d'un repos entre séries. */
const MIN_SECONDS = 5;
const MAX_SECONDS = 3600;

/** Cadence de rafraîchissement de l'affichage. */
const TICK_MS = 250;

const clamp = (seconds: number) => Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, seconds));

/**
 * Le timer est stocké sous forme d'un *instant de fin*, pas d'un compte à
 * rebours décrémenté : il reste donc exact même si l'onglet passe en arrière-plan
 * ou si l'on navigue dans l'application. La persistance locale lui permet de
 * survivre à un rechargement de page.
 */
export const useRestTimerStore = create<RestTimerState>()(
  persist(
    (set, get) => ({
      endsAt: null,
      pausedRemaining: null,
      totalSeconds: 90,
      label: null,

      start: (seconds, label) => {
        const total = clamp(Math.round(seconds));
        set({
          endsAt: Date.now() + total * 1000,
          pausedRemaining: null,
          totalSeconds: total,
          label: label ?? null,
        });
      },

      pause: () => {
        const { endsAt } = get();
        if (endsAt === null) return;
        set({
          pausedRemaining: Math.max(0, Math.round((endsAt - Date.now()) / 1000)),
          endsAt: null,
        });
      },

      resume: () => {
        const { pausedRemaining } = get();
        if (pausedRemaining === null) return;
        set({ endsAt: Date.now() + pausedRemaining * 1000, pausedRemaining: null });
      },

      adjust: (deltaSeconds) => {
        const { endsAt, pausedRemaining } = get();
        if (endsAt !== null) {
          const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
          set({ endsAt: Date.now() + Math.max(0, remaining + deltaSeconds) * 1000 });
        } else if (pausedRemaining !== null) {
          set({ pausedRemaining: Math.max(0, pausedRemaining + deltaSeconds) });
        }
      },

      reset: () => {
        const { totalSeconds } = get();
        set({ endsAt: Date.now() + totalSeconds * 1000, pausedRemaining: null });
      },

      stop: () => set({ endsAt: null, pausedRemaining: null, label: null }),
    }),
    {
      name: "forgefit-rest-timer",
      partialize: (state) => ({
        endsAt: state.endsAt,
        pausedRemaining: state.pausedRemaining,
        totalSeconds: state.totalSeconds,
        label: state.label,
      }),
    },
  ),
);

export interface RestTimerStatus {
  isActive: boolean;
  isPaused: boolean;
  remainingSeconds: number;
  totalSeconds: number;
  isFinished: boolean;
}

/** Secondes restantes à l'instant présent, d'après l'instant de fin stocké. */
function computeRemaining(endsAt: number | null, pausedRemaining: number | null): number {
  if (endsAt === null) return pausedRemaining ?? 0;
  return Math.max(0, Math.round((endsAt - Date.now()) / 1000));
}

/**
 * Expose les secondes restantes.
 *
 * Le compte à rebours est recalculé depuis l'instant de fin plutôt que
 * décrémenté : il reste juste même après une mise en veille de l'appareil ou un
 * passage en arrière-plan. La lecture de l'horloge se fait exclusivement dans
 * l'intervalle, jamais pendant le rendu.
 */
export function useRestTimer(): RestTimerStatus {
  const endsAt = useRestTimerStore((state) => state.endsAt);
  const pausedRemaining = useRestTimerStore((state) => state.pausedRemaining);
  const totalSeconds = useRestTimerStore((state) => state.totalSeconds);

  // Valeur de départ sans lire l'horloge : elle est exacte au démarrage d'un
  // repos, et corrigée au premier tick dans le cas d'un rechargement en cours
  // de décompte.
  const [remaining, setRemaining] = useState(pausedRemaining ?? totalSeconds);

  useEffect(() => {
    const update = () => setRemaining(computeRemaining(endsAt, pausedRemaining));

    // Recalage immédiat, mais différé d'un tour de boucle : appeler setState
    // directement dans le corps d'un effet provoque un rendu en cascade.
    const immediate = setTimeout(update, 0);
    if (endsAt === null) return () => clearTimeout(immediate);

    const interval = setInterval(update, TICK_MS);
    return () => {
      clearTimeout(immediate);
      clearInterval(interval);
    };
  }, [endsAt, pausedRemaining]);

  return {
    isActive: endsAt !== null || pausedRemaining !== null,
    isPaused: endsAt === null && pausedRemaining !== null,
    remainingSeconds: remaining,
    totalSeconds,
    isFinished: endsAt !== null && remaining <= 0,
  };
}
