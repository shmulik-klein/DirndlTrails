import { addHike, listHikes } from "@/lib/hikeStore";
import { hikeInputSchema } from "@/lib/hikeSchema";

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  if (request.method === "GET") {
    try {
      const hikes = await listHikes();
      return response.status(200).json({ hikes });
    } catch (error) {
      console.error("Failed to read hikes", error);
      return response.status(500).json({ error: "Could not load hikes" });
    }
  }

  if (request.method === "POST") {
    const parsed = hikeInputSchema.safeParse(request.body);

    if (!parsed.success) {
      return response.status(400).json({
        error: "Some fields are invalid",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const hike = await addHike(parsed.data);
      return response.status(201).json({ hike });
    } catch (error) {
      console.error("Failed to save hike", error);
      return response.status(500).json({ error: "Could not save hike" });
    }
  }

  response.setHeader("Allow", ["GET", "POST"]);
  return response
    .status(405)
    .json({ error: `Method ${request.method} not allowed` });
}
