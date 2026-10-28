import type { NextApiRequest, NextApiResponse } from "next";

export function methodNotAllowed(
  res: NextApiResponse,
  methods: string[]
): void {
  res.setHeader("Allow", methods);
  res.setHeader("Cache-Control", "no-store");
  res.status(405).json({ error: "Method not allowed" });
}

export function hasJsonContentType(req: NextApiRequest): boolean {
  const header = req.headers["content-type"];
  if (typeof header !== "string") return false;
  return header.split(";")[0]?.trim().toLowerCase() === "application/json";
}

export function noStore(res: NextApiResponse): void {
  res.setHeader("Cache-Control", "no-store, max-age=0");
}
