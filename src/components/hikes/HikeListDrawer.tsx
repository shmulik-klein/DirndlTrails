import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Hike } from "@/lib/hikeSchema";

import { HikeListItem } from "./HikeListItem";

type SortOption = "newest" | "oldest" | "name-asc" | "name-desc" | "distance-desc";
type FilterOption = "all" | "done" | "planned";

type Props = {
  open: boolean;
  hikes: Hike[];
  onClose: () => void;
  onSelectHike: (hike: Hike) => void;
  onAddHike: () => void;
  onRemoveHike: (hike: Hike) => Promise<void> | void;
  removingIds?: Set<string>;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "distance-desc", label: "Distance (longest)" },
];

function getSearchText(hike: Hike): string {
  return [
    hike.name,
    hike.description ?? "",
    hike.difficulty,
    formatHikeDateSafe(hike.date),
  ]
    .join(" ")
    .toLowerCase();
}

function formatHikeDateSafe(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-GB");
}

export function HikeListDrawer({
  open,
  hikes,
  onClose,
  onSelectHike,
  onAddHike,
  onRemoveHike,
  removingIds = new Set(),
}: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [wasOpen, setWasOpen] = useState(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Reset filters when the drawer closes. Adjusting state during render is the
  // React-recommended alternative to a prop-syncing side effect.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setQuery("");
      setSort("newest");
      setFilter("all");
    }
  }

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      searchRef.current?.focus();
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

  const handleSelect = useCallback(
    (hike: Hike) => {
      onSelectHike(hike);
    },
    [onSelectHike]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    let results = hikes;

    if (filter !== "all") {
      results = results.filter((hike) => (hike.status ?? "done") === filter);
    }

    if (normalized) {
      results = results.filter((hike) => getSearchText(hike).includes(normalized));
    }

    const sorted = [...results];

    sorted.sort((a, b) => {
      if (sort === "name-asc") {
        return a.name.localeCompare(b.name);
      }

      if (sort === "name-desc") {
        return b.name.localeCompare(a.name);
      }

      if (sort === "oldest") {
        return a.date.localeCompare(b.date);
      }

      if (sort === "distance-desc") {
        return (b.distanceKm ?? -1) - (a.distanceKm ?? -1);
      }

      // newest first
      return b.date.localeCompare(a.date);
    });

    return sorted;
  }, [hikes, query, sort, filter]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000]">
      <button
        type="button"
        aria-label="Close hikes list"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full animate-fade-in cursor-default bg-slate-900/40 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hikes-list-title"
        className="absolute inset-y-0 left-0 flex w-full animate-drawer-in-left flex-col bg-white shadow-2xl dark:bg-slate-950 sm:max-w-md"
      >
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="hikes-list-title"
                className="text-lg font-semibold text-slate-900 dark:text-white"
              >
                All hikes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {hikes.length} {hikes.length === 1 ? "trail" : "trails"} recorded
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

          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {[
                { value: "all", label: "All" },
                { value: "done", label: "Done" },
                { value: "planned", label: "Planned" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value as FilterOption)}
                  className={
                    filter === option.value
                      ? "rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              >
                <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M10.5 10.5L13.25 13.25"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search hikes..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:bg-slate-950"
              />
            </div>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-emerald-400"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 6H15M3 9H15M3 12H15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                {query ? "No hikes match your search" : "No hikes yet"}
              </h3>
              <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                {query
                  ? "Try adjusting your search terms."
                  : "Start logging your Bavarian trails to see them here."}
              </p>
              {!query ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAddHike();
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30"
                >
                  <span aria-hidden="true">+</span>
                  Add your first hike
                </button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((hike) => (
                <HikeListItem
                  key={hike.id}
                  hike={hike}
                  removing={removingIds.has(hike.id)}
                  onSelect={(selected) => {
                    if (removingIds.has(selected.id)) return;
                    handleSelect(selected);
                    onClose();
                  }}
                  onRemove={onRemoveHike}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
