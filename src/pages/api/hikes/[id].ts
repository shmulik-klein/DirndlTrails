import { removeHike } from "@/lib/hikeStore";

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const { id } = request.query;

  if (request.method !== "DELETE") {
    response.setHeader("Allow", ["DELETE"]);
    return response
      .status(405)
      .json({ error: `Method ${request.method} not allowed` });
  }

  if (typeof id !== "string" || id.trim().length === 0) {
    return response.status(400).json({ error: "Invalid hike id" });
  }

  try {
    const result = await removeHike(id);
    if (!result.deleted) {
      return response.status(404).json({ error: "Hike not found" });
    }
    return response.status(200).json(result);
  } catch (error) {
    console.error("Failed to remove hike", error);
    return response.status(500).json({ error: "Could not remove hike" });
  }
}
