import {
  difficultyMeta,
  formatDistance,
  formatDuration,
  formatElevation,
  formatHikeDate,
} from "@/lib/format";
import type { Hike } from "@/lib/hikeSchema";

type Props = {
  hike: Hike;
  onSelect: (hike: Hike) => void;
};

export function HikeListItem({ hike, onSelect }: Props) {
  const difficulty = difficultyMeta[hike.difficulty] ?? difficultyMeta.moderate;
  const stats = [
    formatDistance(hike.distanceKm),
    formatElevation(hike.elevationGainM),
    formatDuration(hike.durationMin),
  ].filter((value): value is string => Boolean(value));

  return (
    <button
      type="button"
      onClick={() => onSelect(hike)}
      className="group w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {hike.name}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {formatHikeDate(hike.date)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${difficulty.badge}`}
        >
          {difficulty.label}
        </span>
      </div>

      {stats.length > 0 ? (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          {stats.map((stat, index) => (
            <span key={stat} className="flex items-center gap-2">
              {stat}
              {index < stats.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="h-1 w-1 rounded-full bg-slate-400 dark:bg-slate-600"
                />
              ) : null}
            </span>
          ))}
        </p>
      ) : null}

      {hike.description ? (
        <div className="mt-3 rounded-lg bg-gradient-to-br from-slate-50 to-white px-3 py-2 shadow-inner ring-1 ring-slate-200/60 dark:from-slate-800/50 dark:to-slate-900/40 dark:ring-slate-700/60">
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {hike.description}
          </p>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-slate-500 transition group-hover:text-emerald-700 dark:text-slate-400 dark:group-hover:text-emerald-300">
          View on map
        </span>
        <span
          aria-hidden="true"
          className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:text-slate-500 dark:group-hover:text-emerald-400"
        >
          →
        </span>
      </div>
    </button>
  );
}
