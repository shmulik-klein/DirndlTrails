import type { NextApiRequest, NextApiResponse } from "next";

import { hasJsonContentType, noStore } from "@/lib/api";
import { isSameOriginRequest, requireAdmin } from "@/lib/auth";
import { hikeInputSchema } from "@/lib/hikeSchema";
import { removeHike, updateHike } from "@/lib/hikeStore";
import { logger } from "@/lib/logger";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  noStore(response);

  const { id } = request.query;

  if (request.method !== "DELETE" && request.method !== "PUT") {
    response.setHeader("Allow", ["DELETE", "PUT"]);
    return response
      .status(405)
      .json({ error: `Method ${request.method} not allowed` });
  }

  if (!(await requireAdmin(request, response))) return;

  if (!isSameOriginRequest(request)) {
    return response.status(403).json({ error: "Invalid origin" });
  }

  if (typeof id !== "string" || id.trim().length === 0) {
    return response.status(400).json({ error: "Invalid hike id" });
  }

  if (request.method === "DELETE") {
    try {
      const result = await removeHike(id);
      if (!result.deleted) {
        return response.status(404).json({ error: "Hike not found" });
      }
      logger.info({ id }, "Hike removed");
      return response.status(200).json(result);
    } catch (error) {
      logger.error({ err: error, id }, "Failed to remove hike");
      return response.status(500).json({ error: "Could not remove hike" });
    }
  }

  if (!hasJsonContentType(request)) {
    return response.status(415).json({ error: "Expected application/json" });
  }

  const parsed = hikeInputSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({
      error: "Some fields are invalid",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const hike = await updateHike(id, parsed.data);
    if (!hike) {
      return response.status(404).json({ error: "Hike not found" });
    }
    logger.info({ id: hike.id, name: hike.name }, "Hike updated");
    return response.status(200).json({ hike });
  } catch (error) {
    logger.error({ err: error, id }, "Failed to update hike");
    return response.status(500).json({ error: "Could not update hike" });
  }
}
