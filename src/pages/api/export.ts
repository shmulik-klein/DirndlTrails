import type { NextApiRequest, NextApiResponse } from "next";

import { methodNotAllowed, noStore } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { listHikes } from "@/lib/hikeStore";
import { logger } from "@/lib/logger";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  noStore(response);

  if (request.method !== "GET") {
    return methodNotAllowed(response, ["GET"]);
  }

  if (!(await requireAdmin(request, response))) return;

  try {
    const hikes = await listHikes();
    const exportedAt = new Date().toISOString();
    const filename = `dirndltrails-${exportedAt.slice(0, 10)}.json`;

    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    return response
      .status(200)
      .send(JSON.stringify({ exportedAt, hikes }, null, 2));
  } catch (error) {
    logger.error({ err: error }, "Failed to export hikes");
    return response.status(500).json({ error: "Could not export hikes" });
  }
}
