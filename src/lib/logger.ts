import pino from "pino";

/**
 * Structured JSON logs written to stdout so Docker/systemd can collect them.
 * The level is read directly from the environment to keep the logger usable
 * during tests and builds where the full server env may not be present.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "dirndltrails" },
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "password",
      "passwordHash",
      "token",
    ],
    censor: "[redacted]",
  },
});
