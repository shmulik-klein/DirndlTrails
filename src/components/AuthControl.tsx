import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

type Props = {
  isAdmin: boolean;
};

const baseClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold shadow-md backdrop-blur transition focus-visible:outline-none focus-visible:ring-4";

export function AuthControl({ isAdmin }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!isAdmin) {
    return (
      <div className="absolute right-4 top-4 z-[950]">
        <Link
          href="/login"
          className={`${baseClass} border-white/60 bg-white/90 text-slate-700 hover:bg-white focus-visible:ring-slate-400/30 dark:border-slate-700/60 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-900`}
        >
          Sign in
        </Link>
      </div>
    );
  }

  const signOut = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await router.replace("/");
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="absolute right-4 top-4 z-[950] flex items-center gap-2">
      <a
        href="/api/export"
        download
        className={`${baseClass} border-white/60 bg-white/90 text-slate-700 hover:bg-white focus-visible:ring-slate-400/30 dark:border-slate-700/60 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-900`}
      >
        Export
      </a>
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className={`${baseClass} border-white/60 bg-white/90 text-slate-700 hover:bg-white focus-visible:ring-slate-400/30 disabled:opacity-60 dark:border-slate-700/60 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-900`}
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
