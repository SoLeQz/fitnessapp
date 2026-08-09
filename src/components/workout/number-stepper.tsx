"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { roundWeight } from "@/lib/load-unit";

interface NumberStepperProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  step: number;
  min?: number;
  max?: number;
  suffix?: string;
  /** Autorise les décimales (charges) ou non (répétitions). */
  allowDecimals?: boolean;
  className?: string;
}

/**
 * Saisie d'un nombre avec incréments. Les boutons sont dimensionnés pour être
 * utilisables d'une main entre deux séries ; le champ reste éditable au clavier
 * pour saisir une valeur éloignée sans marteler le bouton.
 */
export function NumberStepper({
  label,
  value,
  onChange,
  step,
  min = 0,
  max = 2000,
  suffix,
  allowDecimals = true,
  className,
}: NumberStepperProps) {
  const bump = (direction: 1 | -1) => {
    const base = value ?? 0;
    const next = roundWeight(base + direction * step, allowDecimals ? 3 : 0);
    onChange(Math.min(max, Math.max(min, next)));
  };

  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
        {label}
        {suffix ? <span className="ml-1 normal-case text-fg-subtle">({suffix})</span> : null}
      </label>

      <div className="flex items-stretch gap-1.5">
        <StepButton onClick={() => bump(-1)} label={`Diminuer ${label}`}>
          <Minus className="size-4" aria-hidden />
        </StepButton>

        <input
          type="number"
          inputMode={allowDecimals ? "decimal" : "numeric"}
          value={value ?? ""}
          min={min}
          max={max}
          step={allowDecimals ? "any" : 1}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === "") return onChange(null);
            const parsed = Number(raw);
            onChange(Number.isFinite(parsed) ? parsed : null);
          }}
          onFocus={(event) => event.target.select()}
          aria-label={label}
          className="tabular h-12 min-w-0 flex-1 rounded-xl border border-border bg-bg-elevated text-center text-lg font-semibold text-fg focus:border-accent focus:outline-none"
        />

        <StepButton onClick={() => bump(1)} label={`Augmenter ${label}`}>
          <Plus className="size-4" aria-hidden />
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-fg-muted transition-colors hover:border-border-strong hover:text-fg active:bg-surface-hover"
    >
      {children}
    </button>
  );
}
