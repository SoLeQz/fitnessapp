import type { Prisma, PrismaClient } from "@/generated/prisma/client";

/**
 * Client Prisma ou client de transaction. Les services qui doivent pouvoir
 * s'exécuter à l'intérieur d'un `$transaction` prennent ce type en premier
 * argument, ce qui les rend aussi réutilisables depuis un script (seed, import).
 */
export type Db = PrismaClient | Prisma.TransactionClient;

/** Convertit un `Decimal` Prisma en nombre, en préservant les valeurs nulles. */
export function decimalToNumber(value: Prisma.Decimal | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return value.toNumber();
}

/** Variante non nullable, pour les colonnes `Decimal` obligatoires. */
export function requiredDecimalToNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}
