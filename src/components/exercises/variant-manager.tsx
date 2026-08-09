"use client";

import { useState, useTransition } from "react";
import { Check, Plus, Star, Trash2 } from "lucide-react";
import {
  deleteVariantAction,
  setDefaultVariantAction,
} from "@/app/(app)/exercises/actions";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";
import { LoadUnit } from "@/generated/prisma/enums";
import type { FormState } from "@/lib/form-state";
import { unitLabel, unitSuffix } from "@/lib/load-unit";
import type { ExerciseVariantView } from "@/server/services/exercise.service";

interface VariantManagerProps {
  exerciseId: string;
  variants: ExerciseVariantView[];
  createAction: (state: FormState, formData: FormData) => Promise<FormState>;
}

/**
 * Gestion des machines d'un exercice. Deux salles n'ont pas la même Chest
 * Press : chaque variante porte sa propre unité et son propre pas, et les
 * comparaisons de progression se font machine par machine.
 */
export function VariantManager({ exerciseId, variants, createAction }: VariantManagerProps) {
  const [isFormOpen, setFormOpen] = useState(variants.length === 0);
  const [isPending, startTransition] = useTransition();

  const active = variants.filter((variant) => !variant.isArchived);
  const archived = variants.filter((variant) => variant.isArchived);

  return (
    <div className="space-y-3">
      {active.length === 0 && !isFormOpen ? (
        <p className="text-sm text-fg-muted">
          Aucune machine configurée : les séries utilisent l’unité par défaut de l’exercice.
        </p>
      ) : null}

      {[...active, ...archived].map((variant) => (
        <div
          key={variant.id}
          className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated px-3.5 py-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium">{variant.label}</span>
              {variant.isDefault ? <Badge tone="accent">par défaut</Badge> : null}
              {variant.isArchived ? <Badge>archivée</Badge> : null}
            </div>
            <p className="mt-0.5 text-xs text-fg-muted">
              {unitLabel(variant.unit)} · pas de {variant.weightIncrement}{" "}
              {unitSuffix(variant.unit)}
              {variant.notes ? ` · ${variant.notes}` : ""}
            </p>
          </div>

          {!variant.isDefault && !variant.isArchived ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(() => setDefaultVariantAction(exerciseId, variant.id))
              }
              className="inline-flex size-8 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:text-warning"
              aria-label={`Définir ${variant.label} par défaut`}
            >
              <Star className="size-4" aria-hidden />
            </button>
          ) : null}

          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => deleteVariantAction(exerciseId, variant.id))}
            className="inline-flex size-8 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:text-danger"
            aria-label={`Supprimer ${variant.label}`}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      ))}

      {isFormOpen ? (
        <div className="rounded-xl border border-border bg-bg-elevated p-3.5">
          <ActionForm
            action={createAction}
            submitLabel="Ajouter la machine"
            pendingLabel="Ajout…"
            fields={[
              {
                name: "label",
                label: "Nom de la machine",
                placeholder: "Matrix, Technogym, Hammer Strength…",
                required: true,
              },
              {
                name: "unit",
                label: "Unité affichée par la machine",
                defaultValue: LoadUnit.KG,
                options: [
                  { value: LoadUnit.KG, label: unitLabel(LoadUnit.KG) },
                  { value: LoadUnit.LBS, label: unitLabel(LoadUnit.LBS) },
                  { value: LoadUnit.LEVEL, label: unitLabel(LoadUnit.LEVEL) },
                ],
              },
              {
                name: "weightIncrement",
                label: "Pas de progression",
                type: "number",
                inputMode: "decimal",
                defaultValue: 2.5,
                min: 0.1,
                max: 100,
                step: 0.1,
                hint: "Écart entre deux crans : 2.5 kg, 5 lbs, 1 niveau…",
                required: true,
              },
              {
                name: "notes",
                label: "Remarques (facultatif)",
                placeholder: "Réglage du siège, position de la poignée…",
              },
            ]}
          />
          {active.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              onClick={() => setFormOpen(false)}
            >
              Annuler
            </Button>
          ) : null}
        </div>
      ) : (
        <Button variant="secondary" size="md" fullWidth onClick={() => setFormOpen(true)}>
          <Plus className="size-4" aria-hidden />
          Ajouter une machine
        </Button>
      )}

      {active.length > 1 ? (
        <p className="flex items-start gap-1.5 text-xs text-fg-subtle">
          <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Les charges ne sont jamais comparées d’une machine à l’autre : chaque variante a son
          propre historique et ses propres records.
        </p>
      ) : null}
    </div>
  );
}
