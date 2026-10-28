import type { NextApiRequest, NextApiResponse } from "next";

import { methodNotAllowed, noStore } from "@/lib/api";
import { checkStore } from "@/lib/hikeStore";
import { logger } from "@/lib/logger";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  noStore(response);

  if (request.method !== "GET") {
    return methodNotAllowed(response, ["GET"]);
  }

  const store = await checkStore();

  if (!store.ok) {
    logger.error({ reason: store.reason }, "Health check failed");
  }

  return response.status(store.ok ? 200 : 503).json({
    status: store.ok ? "ok" : "degraded",
    store: store.ok ? "ok" : "error",
    version: process.env.APP_VERSION ?? "dev",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
