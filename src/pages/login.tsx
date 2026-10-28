import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import type { FormEvent } from "react";
import type { GetServerSideProps } from "next";

import { isAdminCookieHeader } from "@/lib/auth";

type Props = {
  next: string;
};

export const getServerSideProps: GetServerSideProps<Props> = async ({
  req,
  query,
}) => {
  if (await isAdminCookieHeader(req.headers.cookie)) {
    return { redirect: { destination: "/", permanent: false } };
  }

  const requested = typeof query.next === "string" ? query.next : "/";
  const next =
    requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  return { props: { next } };
};

export default function LoginPage({ next }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? "Could not sign in");
        return;
      }

      await router.replace(next);
    } catch {
      setError("Could not reach the server. Check your connection and retry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign in · DirndlTrails</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <main className="flex min-h-[100dvh] items-center justify-center bg-slate-100 px-4 py-12 dark:bg-slate-950">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              DirndlTrails
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Sign in to add and remove hikes.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300"
              >
                Admin password
              </label>

              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : undefined}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-16 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error ? (
              <p
                id="login-error"
                role="alert"
                className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting || password.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            <Link
              href="/"
              className="font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800 dark:text-emerald-400 dark:decoration-emerald-500/40 dark:hover:text-emerald-300"
            >
              Back to the map
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
