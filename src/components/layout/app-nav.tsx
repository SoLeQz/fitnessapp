"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/cn";
import { isNavItemActive, NAV_ITEMS } from "./nav-config";

/** Barre latérale, affichée à partir de `md`. */
export function SidebarNav({ displayName }: { displayName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-bg-elevated md:flex md:flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-fg">
          <Dumbbell className="size-4" aria-hidden />
        </span>
        <span className="font-semibold tracking-tight">ForgeFit</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3" aria-label="Navigation principale">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-fg-muted hover:bg-surface hover:text-fg",
              )}
            >
              {/* Rail vertical : la page courante reste identifiable même pour
                  un œil qui distingue mal le cyan du gris. */}
              {active ? (
                <span
                  className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent"
                  aria-hidden
                />
              ) : null}
              <item.icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <p className="truncate border-t border-border px-5 py-4 text-xs text-fg-subtle">
        {displayName}
      </p>
    </aside>
  );
}

/** Barre inférieure mobile : cinq cibles tactiles pleine hauteur. */
export function BottomNav() {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.primary);

  return (
    <nav
      aria-label="Navigation principale"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border",
        "bg-bg-elevated/95 backdrop-blur md:hidden",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      {items.map((item) => {
        const active = isNavItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition-colors",
              active ? "font-medium text-accent" : "text-fg-subtle",
            )}
          >
            {/* Barre haute plutôt qu'une simple mise en couleur : l'onglet
                courant se repère du coin de l'œil, entre deux séries. */}
            {active ? (
              <span
                className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-accent"
                aria-hidden
              />
            ) : null}
            <item.icon className="size-5" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
