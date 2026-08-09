/**
 * Forme normalisée d'un nom d'exercice : minuscules, sans accent, espaces
 * réduits. Sert à la fois de clé d'unicité (« Développé Couché » et
 * « developpe couche » sont le même exercice) et de cible de recherche.
 */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Découpe une recherche en termes normalisés non vides. */
export function searchTerms(query: string): string[] {
  return normalizeName(query).split(" ").filter(Boolean);
}
