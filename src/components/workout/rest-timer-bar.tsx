"use client";

import { useEffect, useRef } from "react";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatClock } from "@/lib/format";
import { useRestTimer, useRestTimerStore } from "@/hooks/use-rest-timer";

/**
 * Barre de repos. Montée dans la mise en page de l'application (et non dans
 * l'écran de séance) pour continuer de tourner et rester visible même en
 * naviguant vers l'historique d'un exercice.
 */
export function RestTimerBar() {
  const status = useRestTimer();
  const { pause, resume, adjust, reset, stop } = useRestTimerStore();
  const hasSignaled = useRef(false);

  // Vibration à l'échéance : en salle, l'écran est rarement sous les yeux.
  useEffect(() => {
    if (!status.isFinished) {
      hasSignaled.current = false;
      return;
    }
    if (hasSignaled.current) return;
    hasSignaled.current = true;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  }, [status.isFinished]);

  if (!status.isActive) return null;

  const progress =
    status.totalSeconds > 0
      ? Math.min(100, ((status.totalSeconds - status.remainingSeconds) / status.totalSeconds) * 100)
      : 0;

  return (
    <div
      role="timer"
      aria-live="off"
      className={cn(
        "fixed inset-x-0 bottom-20 z-40 mx-auto w-[min(100%-1rem,32rem)] md:bottom-4",
        "animate-rise overflow-hidden rounded-2xl border bg-bg-elevated/95 shadow-xl backdrop-blur",
        status.isFinished ? "border-success/50" : "border-border",
      )}
    >
      <div
        className={cn(
          "h-0.5 transition-all duration-300",
          status.isFinished ? "bg-success" : "bg-accent",
        )}
        style={{ width: `${progress}%` }}
      />

      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-fg-subtle">
            {status.isFinished ? "Repos terminé" : status.isPaused ? "Repos en pause" : "Repos"}
          </p>
          <p
            className={cn(
              "tabular text-2xl font-semibold leading-none",
              status.isFinished ? "animate-pulse-soft text-success" : "text-fg",
            )}
          >
            {formatClock(status.remainingSeconds)}
          </p>
        </div>

        <TimerButton onClick={() => adjust(-30)} label="Retirer 30 secondes">
          −30
        </TimerButton>
        <TimerButton onClick={() => adjust(30)} label="Ajouter 30 secondes">
          +30
        </TimerButton>
        <TimerButton onClick={reset} label="Réinitialiser">
          <RotateCcw className="size-4" aria-hidden />
        </TimerButton>
        <TimerButton
          onClick={status.isPaused ? resume : pause}
          label={status.isPaused ? "Reprendre" : "Mettre en pause"}
        >
          {status.isPaused ? (
            <Play className="size-4" aria-hidden />
          ) : (
            <Pause className="size-4" aria-hidden />
          )}
        </TimerButton>
        <TimerButton onClick={stop} label="Fermer le timer" tone="danger">
          <X className="size-4" aria-hidden />
        </TimerButton>
      </div>
    </div>
  );
}

function TimerButton({
  onClick,
  label,
  tone = "neutral",
  children,
}: {
  onClick: () => void;
  label: string;
  tone?: "neutral" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-border px-2 text-xs font-medium transition-colors",
        tone === "danger"
          ? "text-fg-subtle hover:border-danger/40 hover:text-danger"
          : "text-fg-muted hover:border-border-strong hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
