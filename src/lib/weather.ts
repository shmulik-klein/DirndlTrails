import type { Weather } from "./hikeSchema";

export const weatherMeta: Record<
  Weather,
  { label: string; badge: string }
> = {
  sunny: {
    label: "Sunny",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
  "partly-cloudy": {
    label: "Partly cloudy",
    badge:
      "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  },
  cloudy: {
    label: "Cloudy",
    badge:
      "bg-slate-100 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300",
  },
  fog: {
    label: "Fog",
    badge:
      "bg-slate-100 text-slate-600 dark:bg-slate-400/10 dark:text-slate-400",
  },
  drizzle: {
    label: "Drizzle",
    badge:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  },
  rain: {
    label: "Rain",
    badge:
      "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  },
  snow: {
    label: "Snow",
    badge:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200",
  },
  storm: {
    label: "Storm",
    badge:
      "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  },
};
