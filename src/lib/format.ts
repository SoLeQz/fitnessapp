/** Formate une durée en secondes : « 1:30 », « 1 h 12 ». */
export function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return "—";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) return `${hours} h ${String(minutes).padStart(2, "0")}`;
  if (minutes > 0) return `${minutes} min`;
  return `${seconds} s`;
}

/** Format d'un chronomètre : « 01:30 ». */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Volume lisible : « 12 480 kg » devient « 12.5 t » au-delà d'une tonne. */
export function formatVolume(kilograms: number): string {
  if (!Number.isFinite(kilograms)) return "—";
  if (kilograms >= 1000) {
    const tonnes = kilograms / 1000;
    return `${tonnes.toFixed(tonnes >= 100 ? 0 : 1).replace(/\.0$/, "")} t`;
  }
  return `${Math.round(kilograms).toLocaleString("fr-FR")} kg`;
}

/** Nombre compact avec séparateurs français. */
export function formatNumber(value: number, fractionDigits = 0): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}
