import { z } from "zod";

/**
 * Server-only environment. Validated lazily so that `next build` (which does
 * not need secrets) can run without production credentials, while the server
 * fails fast on the first request when something is missing.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters long"),
  ADMIN_PASSWORD_HASH: z
    .string()
    .min(1, "ADMIN_PASSWORD_HASH is required (run `npm run hash-password`)"),
  DATA_DIR: z.string().min(1).default("./data"),
  APP_ORIGIN: z.url("APP_ORIGIN must be an absolute URL"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  SENTRY_DSN: z.url().optional(),
  TRUST_PROXY: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment configuration:\n${formatIssues(parsed.error)}`
    );
  }

  cached = parsed.data;
  return cached;
}

/** Test helper: forget the cached environment after mutating process.env. */
export function resetServerEnvCache(): void {
  cached = null;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
