"use client";

import { useState, useTransition } from "react";
import { Play } from "lucide-react";
import { startWorkoutAction } from "@/app/(app)/workout/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { toDisplayMessage } from "@/lib/errors";

/**
 * Démarrage d'une séance, éventuellement à partir d'un jour de programme.
 * C'est le premier geste de l'application : il doit tenir en un seul appui.
 */
export function StartWorkoutButton({
  label,
  programDayId,
  name,
  variant = "primary",
  size = "xl",
  fullWidth = true,
}: {
  label: string;
  programDayId?: string;
  name?: string;
  variant?: "primary" | "secondary";
  size?: "md" | "lg" | "xl";
  fullWidth?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setError(null);
    startTransition(async () => {
      try {
        await startWorkoutAction({
          ...(programDayId ? { programDayId } : {}),
          ...(name ? { name } : {}),
        });
      } catch (cause) {
        setError(toDisplayMessage(cause));
      }
    });
  };

  return (
    <div className={fullWidth ? "w-full space-y-2" : "space-y-2"}>
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        onClick={start}
        disabled={isPending}
      >
        <Play className="size-5" aria-hidden />
        {isPending ? "Démarrage…" : label}
      </Button>
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
