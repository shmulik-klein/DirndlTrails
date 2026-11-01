import { useCallback, useEffect, useRef, useState } from "react";

import type { Hike } from "@/lib/hikeSchema";

import { HikeForm } from "./HikeForm";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (hike: Hike) => void;
  hike?: Hike | null;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function HikeDrawer({ open, onClose, onCreated, hike = null }: Props) {
  const [dirty, setDirty] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  const dirtyRef = useRef(dirty);
  const panelRef = useRef<HTMLDivElement>(null);
  const isEdit = Boolean(hike);

  // Reset the dirty flag when the drawer closes (render-time adjustment).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setDirty(false);
  }

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const requestClose = useCallback(() => {
    if (
      dirtyRef.current &&
      !window.confirm(
        isEdit
          ? "You have unsaved changes. Discard your edits?"
          : "You have unsaved changes. Discard this hike?"
      )
    ) {
      return;
    }

    onClose();
  }, [isEdit, onClose]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>("input, textarea, select")
        ?.focus();
    }, 60);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
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
  }, [open, requestClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000]">
      <button
        type="button"
        aria-label={isEdit ? "Close edit hike panel" : "Close add hike panel"}
        tabIndex={-1}
        onClick={requestClose}
        className="absolute inset-0 h-full w-full animate-fade-in cursor-default bg-slate-900/40 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hike-drawer-title"
        className="absolute inset-y-0 right-0 flex w-full animate-drawer-in flex-col bg-white shadow-2xl dark:bg-slate-950 sm:max-w-md"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2
              id="hike-drawer-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              {isEdit ? "Edit hike" : "Add a hike"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEdit
                ? "Update trail details, location, or photos."
                : "Trail details, a pin on the map, and a few photos."}
            </p>
          </div>

          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/20 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <HikeForm
          hike={hike}
          onCreated={onCreated}
          onCancel={requestClose}
          onDirtyChange={setDirty}
        />
      </div>
    </div>
  );
}
