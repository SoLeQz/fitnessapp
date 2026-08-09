import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose des classes Tailwind en laissant la dernière l'emporter sur les
 * précédentes du même groupe : un composant peut ainsi exposer une prop
 * `className` qui surcharge réellement son style par défaut.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
