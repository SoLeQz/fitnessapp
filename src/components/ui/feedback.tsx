import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-surface-hover text-fg-muted border-border",
  accent: "bg-accent-soft text-accent border-accent/30",
  success: "bg-success-soft text-success border-success/30",
  warning: "bg-warning-soft text-warning border-warning/30",
  danger: "bg-danger-soft text-danger border-danger/30",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Bandeau d'erreur ou de confirmation d'un formulaire. */
export function Alert({
  tone = "danger",
  children,
  className,
}: {
  tone?: Extract<BadgeTone, "danger" | "success" | "accent">;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("rounded-xl border px-3.5 py-2.5 text-sm", TONE_CLASSES[tone], className)}
    >
      {children}
    </div>
  );
}

/** État vide : un message et, si pertinent, l'action qui le résout. */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border px-6 py-10 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-fg">{title}</p>
      {description ? <p className="max-w-sm text-xs text-fg-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Chiffre clé du tableau de bord. */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const valueTone =
    tone === "accent"
      ? "text-accent"
      : tone === "success"
        ? "text-success"
        : tone === "danger"
          ? "text-danger"
          : tone === "warning"
            ? "text-warning"
            : "text-fg";

  /*
   * Une tuile accentuée porte aussi son fond et sa bordure, pas seulement une
   * couleur de chiffre. Quatre tuiles strictement identiques obligent à toutes
   * les lire pour trouver celle qui compte ; ici la principale se repère sans
   * lecture, à la forme.
   */
  const container =
    tone === "accent"
      ? "border-accent/35 bg-accent-soft"
      : "border-border bg-surface";

  return (
    <div className={cn("rounded-card border p-3.5 shadow-card", container, className)}>
      <p
        className={cn(
          "text-[11px] font-medium uppercase tracking-wide",
          tone === "accent" ? "text-accent/80" : "text-fg-subtle",
        )}
      >
        {label}
      </p>
      <p className={cn("tabular mt-1.5 text-[1.75rem] font-semibold leading-none", valueTone)}>
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-fg-muted">{hint}</p> : null}
    </div>
  );
}
