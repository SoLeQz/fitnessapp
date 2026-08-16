import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-fg font-semibold shadow-card hover:bg-accent-hover active:bg-accent-hover",
  secondary:
    "bg-surface text-fg border border-border hover:bg-surface-hover hover:border-border-strong",
  ghost: "text-fg-muted hover:text-fg hover:bg-surface",
  danger: "bg-danger-soft text-danger border border-danger/30 hover:bg-danger/20",
  success: "bg-success text-bg font-semibold hover:brightness-110",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  // Taille par défaut en séance : la cible tactile reste confortable même avec
  // les mains moites ou en tenant une barre.
  lg: "h-12 px-5 text-base gap-2 rounded-xl",
  xl: "h-16 px-6 text-lg gap-2.5 rounded-2xl",
};

/**
 * Classes d'un bouton, exposées séparément pour qu'un `<Link>` puisse avoir
 * exactement la même apparence sans imbriquer un `<a>` dans un `<button>`.
 */
export function buttonClassName({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return cn(
    "inline-flex items-center justify-center whitespace-nowrap",
    // La transformation est listée explicitement : un `transition-all` ferait
    // aussi glisser la largeur du bouton quand son libellé change en cours de
    // séance (« Valider » → « Mettre à jour »), ce qui saute aux yeux.
    "transition-[background-color,border-color,color,box-shadow,transform] duration-150",
    // Retour tactile à l'appui : indispensable sur téléphone, où il n'y a pas
    // de survol pour confirmer que la cible a bien été touchée.
    "active:scale-[0.97] disabled:active:scale-100",
    "disabled:cursor-not-allowed disabled:opacity-45",
    "select-none touch-manipulation",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth && "w-full",
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function Button({
  variant,
  size,
  fullWidth,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, fullWidth, className })}
      {...props}
    />
  );
}
