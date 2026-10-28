import { describe, expect, it } from "vitest";

import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatHikeDate,
} from "./format";

describe("formatHikeDate", () => {
  it("formats ISO dates for a stable locale", () => {
    expect(formatHikeDate("2025-03-23")).toBe("23 Mar 2025");
  });

  it("returns unparseable input unchanged", () => {
    expect(formatHikeDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDistance", () => {
  it("returns null when missing", () => {
    expect(formatDistance(undefined)).toBeNull();
  });

  it("rounds to one decimal place", () => {
    expect(formatDistance(5.24)).toBe("5.2 km");
    expect(formatDistance(4)).toBe("4 km");
  });
});

describe("formatElevation", () => {
  it("appends metres", () => {
    expect(formatElevation(620)).toBe("620 m");
    expect(formatElevation(undefined)).toBeNull();
  });
});

describe("formatDuration", () => {
  it("formats minutes, hours and mixed values", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(120)).toBe("2 h");
    expect(formatDuration(90)).toBe("1 h 30 min");
    expect(formatDuration(undefined)).toBeNull();
  });
});
