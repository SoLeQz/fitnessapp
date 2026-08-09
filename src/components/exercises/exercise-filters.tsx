"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, Star, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { EXERCISE_CATEGORY_OPTIONS, MUSCLE_GROUP_OPTIONS } from "@/lib/labels";
import { Select, TextInput } from "@/components/ui/field";

/** Attente avant de relancer la recherche pendant la frappe. */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * Filtres de la bibliothèque. L'état vit dans l'URL : un filtrage est
 * partageable, survit au rafraîchissement et au retour arrière. Seul le texte
 * en cours de frappe est tenu localement, le temps de la temporisation.
 */
export function ExerciseFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(() => searchParams.get("query") ?? "");
  /** Dernière valeur réellement poussée dans l'URL, pour ne pas la repousser. */
  const appliedQuery = useRef(query);

  const navigate = (params: URLSearchParams) => {
    const search = params.toString();
    startTransition(() => {
      router.replace(search ? `/exercises?${search}` : "/exercises", { scroll: false });
    });
  };

  const applyParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    navigate(params);
  };

  // La recherche part après une courte pause : on ne déclenche pas une requête
  // par caractère saisi.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === appliedQuery.current) return;

    const timer = setTimeout(() => {
      appliedQuery.current = trimmed;
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) params.set("query", trimmed);
      else params.delete("query");

      const search = params.toString();
      startTransition(() => {
        router.replace(search ? `/exercises?${search}` : "/exercises", { scroll: false });
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, searchParams, router, startTransition]);

  const resetAll = () => {
    setQuery("");
    appliedQuery.current = "";
    startTransition(() => router.replace("/exercises", { scroll: false }));
  };

  const favoritesOnly = searchParams.get("favoritesOnly") === "true";
  const mineOnly = searchParams.get("mineOnly") === "true";

  return (
    <div className={cn("space-y-2.5", isPending && "opacity-70")}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
          aria-hidden
        />
        <TextInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un exercice…"
          aria-label="Rechercher un exercice"
          type="search"
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          aria-label="Groupe musculaire"
          value={searchParams.get("muscleGroup") ?? ""}
          onChange={(event) => applyParam("muscleGroup", event.target.value || null)}
          className="h-9 w-auto min-w-36 text-sm"
        >
          <option value="">Tous les groupes</option>
          {MUSCLE_GROUP_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Catégorie"
          value={searchParams.get("category") ?? ""}
          onChange={(event) => applyParam("category", event.target.value || null)}
          className="h-9 w-auto min-w-32 text-sm"
        >
          <option value="">Tout matériel</option>
          {EXERCISE_CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <FilterToggle
          active={favoritesOnly}
          onClick={() => applyParam("favoritesOnly", favoritesOnly ? null : "true")}
        >
          <Star className={cn("size-3.5", favoritesOnly && "fill-current")} aria-hidden />
          Favoris
        </FilterToggle>

        <FilterToggle
          active={mineOnly}
          onClick={() => applyParam("mineOnly", mineOnly ? null : "true")}
        >
          Mes exercices
        </FilterToggle>

        {searchParams.size > 0 || query !== "" ? (
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm text-fg-subtle hover:text-fg"
          >
            <X className="size-3.5" aria-hidden />
            Réinitialiser
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FilterToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
        active
          ? "border-accent/40 bg-accent-soft text-accent"
          : "border-border bg-surface text-fg-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
