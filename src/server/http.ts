import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { flattenZodError } from "@/lib/form-state";
import { AppError, ValidationError } from "./errors";

export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, string[]> };
}

/**
 * Traduit une erreur en réponse HTTP. Seules les erreurs métier exposent leur
 * message ; tout le reste devient un 500 générique, journalisé côté serveur.
 */
export function handleRouteError(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Données invalides",
          details: flattenZodError(error),
        },
      },
      { status: 422 },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.status },
    );
  }

  console.error("Erreur non gérée :", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Une erreur inattendue est survenue." } },
    { status: 500 },
  );
}

/** Parse et valide un corps JSON, en `ValidationError` si le JSON est illisible. */
export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new ValidationError("Corps de requête JSON invalide");
  }
  return schema.parse(payload);
}

/**
 * Comme `parseJsonBody`, mais tolère un corps absent : le schéma est alors
 * appliqué à un objet vide, ce qui laisse jouer ses valeurs par défaut.
 */
export async function parseOptionalJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  const raw = await request.text();
  if (raw.trim().length === 0) return schema.parse({});

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new ValidationError("Corps de requête JSON invalide");
  }
  return schema.parse(payload);
}

/** Valide les paramètres de recherche d'une URL. */
export function parseSearchParams<T>(request: Request, schema: ZodType<T>): T {
  const url = new URL(request.url);
  const raw: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) raw[key] = value;
  return schema.parse(raw);
}
