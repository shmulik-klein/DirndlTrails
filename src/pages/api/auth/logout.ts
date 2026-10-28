import type { NextApiRequest, NextApiResponse } from "next";

import { methodNotAllowed, noStore } from "@/lib/api";
import {
  createExpiredSessionCookie,
  isSameOriginRequest,
  serializeSessionCookie,
} from "@/lib/auth";

export default function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  noStore(response);

  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  if (!isSameOriginRequest(request)) {
    return response.status(403).json({ error: "Invalid origin" });
  }

  response.setHeader(
    "Set-Cookie",
    serializeSessionCookie(createExpiredSessionCookie())
  );

  return response.status(200).json({ ok: true });
}
