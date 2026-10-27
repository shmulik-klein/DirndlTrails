type Props = {
  onClick: () => void;
};

export function ListHikesButton({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-20 right-6 z-[900] inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-6 text-sm font-semibold text-slate-800 shadow-lg backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30 active:scale-95 dark:border-slate-700/60 dark:bg-slate-900/95 dark:text-slate-100 dark:hover:bg-slate-900"
      aria-label="View all hikes"
    >
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 4H14M2 8H14M2 12H14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      Hikes
    </button>
  );
}
