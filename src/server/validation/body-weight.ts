import { z } from "zod";
import { LoadUnit } from "@/generated/prisma/enums";

export const recordBodyWeightSchema = z.object({
  weight: z.coerce
    .number()
    .positive("Le poids doit être positif")
    .max(700, "Valeur hors plage"),
  unit: z.enum([LoadUnit.KG, LoadUnit.LBS]).default(LoadUnit.KG),
  measuredOn: z.coerce.date().default(() => new Date()),
  notes: z.string().trim().max(300).nullish(),
});

export type RecordBodyWeightPayload = z.infer<typeof recordBodyWeightSchema>;
