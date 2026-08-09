/**
 * Erreurs métier. Les services les lèvent sans rien savoir du transport ; la
 * couche HTTP les traduit en statut via `httpStatusForError`.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Données invalides", details?: Record<string, string[]>) {
    super(message, "VALIDATION_ERROR", 422, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentification requise") {
    super(message, "UNAUTHORIZED", 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Accès refusé") {
    super(message, "FORBIDDEN", 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Ressource introuvable") {
    super(message, "NOT_FOUND", 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflit avec une ressource existante") {
    super(message, "CONFLICT", 409);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
