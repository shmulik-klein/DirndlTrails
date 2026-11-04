import { useEffect, useMemo, useRef, useState } from "react";

import type { Hike } from "@/lib/hikeSchema";
import { formatDistance, formatDuration, formatElevation } from "@/lib/format";

type Props = {
  open: boolean;
  hikes: Hike[];
  onClose: () => void;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function formatTotalDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return "—";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatAvgDuration(totalMinutes: number, count: number): string {
  if (totalMinutes <= 0 || count <= 0) return "—";
  const avg = Math.round(totalMinutes / count);
  return formatTotalDuration(avg);
}

function getYear(date: string): number | null {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getFullYear();
}

export function StatsDrawer({ open, hikes, onClose }: Props) {
  const [wasOpen, setWasOpen] = useState(open);
  const panelRef = useRef<HTMLDivElement>(null);

  if (open !== wasOpen) {
    setWasOpen(open);
  }

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>("button")
        ?.focus();
    }, 60);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  const stats = useMemo(() => {
    const total = hikes.length;
    const done = hikes.filter((h) => (h.status ?? "done") === "done").length;
    const planned = total - done;

    let totalDistance = 0;
    let totalElevation = 0;
    let totalDuration = 0;
    let distanceCount = 0;
    let elevationCount = 0;
    let durationCount = 0;

    hikes.forEach((hike) => {
      if (typeof hike.distanceKm === "number") {
        totalDistance += hike.distanceKm;
        distanceCount += 1;
      }
      if (typeof hike.elevationGainM === "number") {
        totalElevation += hike.elevationGainM;
        elevationCount += 1;
      }
      if (typeof hike.durationMin === "number") {
        totalDuration += hike.durationMin;
        durationCount += 1;
      }
    });

    const difficultyCounts = {
      easy: 0,
      moderate: 0,
      hard: 0,
    };
    hikes.forEach((hike) => {
      if (hike.difficulty in difficultyCounts) {
        difficultyCounts[hike.difficulty as keyof typeof difficultyCounts] += 1;
      }
    });

    const yearCounts = new Map<number, number>();
    hikes.forEach((hike) => {
      const year = getYear(hike.date);
      if (year !== null) {
        yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
      }
    });
    const years = Array.from(yearCounts.entries()).sort((a, b) => b[0] - a[0]);

    return {
      total,
      done,
      planned,
      totalDistance,
      totalElevation,
      totalDuration,
      distanceCount,
      elevationCount,
      durationCount,
      difficultyCounts,
      years,
    };
  }, [hikes]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000]">
      <button
        type="button"
        aria-label="Close stats panel"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full animate-fade-in cursor-default bg-slate-900/40 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-drawer-title"
        className="absolute inset-y-0 right-0 flex w-full animate-drawer-in flex-col bg-white shadow-2xl dark:bg-slate-950 sm:max-w-md"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2
              id="stats-drawer-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              Hike stats
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Totals across all logged and planned hikes
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/20 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {stats.total === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center dark:border-slate-700">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                No hikes yet
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Add some hikes to see stats here.
              </p>
            </div>
          ) : (
            <>
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                  Overview
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {stats.total}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Total
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                    <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                      {stats.done}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Done
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                    <p className="text-lg font-semibold text-sky-700 dark:text-sky-300">
                      {stats.planned}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Planned
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                  Totals
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {stats.distanceCount > 0
                        ? `${stats.totalDistance.toFixed(1)} km`
                        : formatDistance(undefined)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Total distance{stats.distanceCount > 0 ? ` (${stats.distanceCount})` : ""}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {stats.elevationCount > 0
                        ? `${Math.round(stats.totalElevation).toLocaleString()} m`
                        : formatElevation(undefined)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Total ascent{stats.elevationCount > 0 ? ` (${stats.elevationCount})` : ""}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatTotalDuration(stats.totalDuration)}
                      {stats.durationCount > 0 ? ` (${stats.durationCount} hikes)` : ""}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Total time • Avg {formatAvgDuration(stats.totalDuration, stats.durationCount)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                  Difficulty
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                    <span className="text-sm text-slate-700 dark:text-slate-200">Easy</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {stats.difficultyCounts.easy}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                    <span className="text-sm text-slate-700 dark:text-slate-200">Moderate</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {stats.difficultyCounts.moderate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                    <span className="text-sm text-slate-700 dark:text-slate-200">Hard</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {stats.difficultyCounts.hard}
                    </span>
                  </div>
                </div>
              </section>

              {stats.years.length > 0 ? (
                <section className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                    By year
                  </h3>
                  <div className="space-y-2">
                    {stats.years.map(([year, count]) => (
                      <div
                        key={year}
                        className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800"
                      >
                        <span className="text-sm text-slate-700 dark:text-slate-200">
                          {year}
                        </span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
