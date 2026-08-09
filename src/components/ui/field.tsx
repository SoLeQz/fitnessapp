import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const CONTROL_CLASSES =
  "w-full rounded-xl border border-border bg-bg-elevated px-3.5 text-fg placeholder:text-fg-subtle " +
  "transition-colors focus:border-accent focus:outline-none disabled:opacity-50";

interface FieldShellProps {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | undefined;
  children: ReactNode;
  className?: string;
}

/** Enveloppe commune : libellé, aide, message d'erreur. */
export function Field({ label, htmlFor, hint, error, children, className }: FieldShellProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-fg-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function TextInput({ className, invalid, ...props }: TextInputProps) {
  return (
    <input
      className={cn(CONTROL_CLASSES, "h-11", invalid && "border-danger", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(CONTROL_CLASSES, "h-11 appearance-none pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL_CLASSES, "min-h-20 py-2.5", className)} {...props} />;
}
