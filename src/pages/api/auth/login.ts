import type { NextApiRequest, NextApiResponse } from "next";

import { hasJsonContentType, methodNotAllowed, noStore } from "@/lib/api";
import {
  createSessionCookie,
  createSessionToken,
  isSameOriginRequest,
  serializeSessionCookie,
  verifyAdminPassword,
} from "@/lib/auth";
import { logger } from "@/lib/logger";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function readPassword(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const value = (body as Record<string, unknown>).password;
  return typeof value === "string" ? value : null;
}

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  noStore(response);

  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  if (!hasJsonContentType(request)) {
    return response.status(415).json({ error: "Expected application/json" });
  }

  if (!isSameOriginRequest(request)) {
    return response.status(403).json({ error: "Invalid origin" });
  }

  const password = readPassword(request.body);

  if (!password || password.length === 0 || password.length > 1024) {
    return response.status(400).json({ error: "Password is required" });
  }

  const ip = clientIp(request);
  const limit = rateLimit(`login:${ip}`, MAX_ATTEMPTS, WINDOW_MS);

  if (!limit.ok) {
    response.setHeader("Retry-After", String(limit.retryAfterSeconds));
    logger.warn({ ip }, "Login rate limit exceeded");
    return response
      .status(429)
      .json({ error: "Too many attempts. Please try again later." });
  }

  if (!(await verifyAdminPassword(password))) {
    logger.warn({ ip, remaining: limit.remaining }, "Failed admin login");
    return response.status(401).json({ error: "Invalid credentials" });
  }

  const token = await createSessionToken();
  response.setHeader(
    "Set-Cookie",
    serializeSessionCookie(createSessionCookie(token))
  );

  logger.info({ ip }, "Admin signed in");
  return response.status(200).json({ ok: true });
}

export const config = {
  api: {
    bodyParser: { sizeLimit: "16kb" },
  },
};
