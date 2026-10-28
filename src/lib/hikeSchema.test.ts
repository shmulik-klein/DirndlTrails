import { describe, expect, it } from "vitest";

import { hikeInputSchema } from "./hikeSchema";

const valid = {
  name: "Riederstein",
  date: "2025-04-21",
  difficulty: "moderate",
  position: [47.7046, 11.7929] as [number, number],
};

describe("hikeInputSchema", () => {
  it("applies defaults for status and photos", () => {
    const parsed = hikeInputSchema.parse(valid);
    expect(parsed.status).toBe("done");
    expect(parsed.photos).toEqual([]);
  });

  it("rejects out-of-range coordinates", () => {
    const result = hikeInputSchema.safeParse({
      ...valid,
      position: [91, 11.2],
    });
    expect(result.success).toBe(false);
  });

  it("rejects malformed dates", () => {
    expect(
      hikeInputSchema.safeParse({ ...valid, date: "21/04/2025" }).success
    ).toBe(false);
    expect(
      hikeInputSchema.safeParse({ ...valid, date: "2025-13-45" }).success
    ).toBe(false);
  });

  it("rejects invalid photo URLs", () => {
    expect(
      hikeInputSchema.safeParse({ ...valid, photos: ["not-a-url"] }).success
    ).toBe(false);
  });

  it("trims string fields", () => {
    const parsed = hikeInputSchema.parse({ ...valid, name: "  Riederstein  " });
    expect(parsed.name).toBe("Riederstein");
  });

  it("rejects negative distances and elevations", () => {
    expect(hikeInputSchema.safeParse({ ...valid, distanceKm: -1 }).success).toBe(
      false
    );
    expect(
      hikeInputSchema.safeParse({ ...valid, elevationGainM: -5 }).success
    ).toBe(false);
  });
});
