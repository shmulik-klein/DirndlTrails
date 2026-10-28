import type { NextApiRequest, NextApiResponse } from "next";

import { hasJsonContentType, noStore } from "@/lib/api";
import { isSameOriginRequest, requireAdmin } from "@/lib/auth";
import { hikeInputSchema } from "@/lib/hikeSchema";
import { addHike, listHikes } from "@/lib/hikeStore";
import { logger } from "@/lib/logger";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  noStore(response);

  if (request.method === "GET") {
    try {
      const hikes = await listHikes();
      return response.status(200).json({ hikes });
    } catch (error) {
      logger.error({ err: error }, "Failed to read hikes");
      return response.status(500).json({ error: "Could not load hikes" });
    }
  }

  if (request.method === "POST") {
    if (!(await requireAdmin(request, response))) return;

    if (!isSameOriginRequest(request)) {
      return response.status(403).json({ error: "Invalid origin" });
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
      const hike = await addHike(parsed.data);
      logger.info({ id: hike.id, name: hike.name }, "Hike created");
      return response.status(201).json({ hike });
    } catch (error) {
      logger.error({ err: error }, "Failed to save hike");
      return response.status(500).json({ error: "Could not save hike" });
    }
  }

  response.setHeader("Allow", ["GET", "POST"]);
  return response
    .status(405)
    .json({ error: `Method ${request.method} not allowed` });
}

export const config = {
  api: {
    bodyParser: { sizeLimit: "64kb" },
  },
};
