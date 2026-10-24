type Props = {
  onClick: () => void;
};

export function AddHikeButton({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-[900] inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 active:scale-95"
    >
      <span aria-hidden="true" className="text-base leading-none">
        +
      </span>
      Add hike
    </button>
  );
}
