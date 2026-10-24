import type { Difficulty } from "./hikeSchema";

export const difficultyMeta: Record<
  Difficulty,
  { label: string; badge: string }
> = {
  easy: {
    label: "Easy",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  moderate: {
    label: "Moderate",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
  hard: {
    label: "Hard",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  },
};

export function formatHikeDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDistance(km?: number): string | null {
  if (km === undefined) return null;
  return `${km.toLocaleString("en-GB", { maximumFractionDigits: 1 })} km`;
}

export function formatElevation(metres?: number): string | null {
  if (metres === undefined) return null;
  return `${metres.toLocaleString("en-GB")} m`;
}

export function formatDuration(minutes?: number): string | null {
  if (minutes === undefined) return null;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}
