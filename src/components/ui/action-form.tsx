"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { fieldError, INITIAL_FORM_STATE, type FormState } from "@/lib/form-state";

type ActionHandler = (state: FormState, formData: FormData) => Promise<FormState>;

/**
 * Description d'un champ. Volontairement déclaratif plutôt qu'un rendu passé en
 * prop : une fonction ne peut pas franchir la frontière serveur/client, et
 * décrire les champs évite de recopier le câblage des erreurs dans chaque page.
 */
export interface FormFieldSpec {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "number" | "date";
  autoComplete?: string;
  inputMode?: "text" | "email" | "numeric" | "decimal";
  required?: boolean;
  placeholder?: string;
  hint?: string;
  defaultValue?: string | number;
  minLength?: number;
  min?: number;
  max?: number;
  step?: number;
  /** Présent : le champ devient une liste déroulante. */
  options?: { value: string; label: string }[];
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" fullWidth disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

interface ActionFormProps {
  action: ActionHandler;
  fields: FormFieldSpec[];
  submitLabel: string;
  pendingLabel: string;
  /** Champs cachés (jeton de réinitialisation, redirection...). */
  hidden?: Record<string, string>;
}

/**
 * Formulaire branché sur une Server Action : gère l'état renvoyé par l'action,
 * le bandeau de message, les erreurs par champ et l'état d'envoi du bouton.
 */
export function ActionForm({
  action,
  fields,
  submitLabel,
  pendingLabel,
  hidden,
}: ActionFormProps) {
  const [state, formAction] = useActionState(action, INITIAL_FORM_STATE);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {hidden
        ? Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}

      {state.status !== "idle" && state.message ? (
        <Alert tone={state.status === "success" ? "success" : "danger"}>{state.message}</Alert>
      ) : null}

      {fields.map((field) => {
        const error = fieldError(state, field.name);
        const controlId = `field-${field.name}`;

        return (
          <Field
            key={field.name}
            label={field.label}
            htmlFor={controlId}
            hint={field.hint}
            error={error}
          >
            {field.options ? (
              <Select
                id={controlId}
                name={field.name}
                defaultValue={field.defaultValue}
                required={field.required}
              >
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            ) : (
              <TextInput
                id={controlId}
                name={field.name}
                type={field.type ?? "text"}
                autoComplete={field.autoComplete}
                inputMode={field.inputMode}
                required={field.required}
                placeholder={field.placeholder}
                defaultValue={field.defaultValue}
                minLength={field.minLength}
                min={field.min}
                max={field.max}
                step={field.step}
                invalid={Boolean(error)}
              />
            )}
          </Field>
        );
      })}

      <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
    </form>
  );
}
