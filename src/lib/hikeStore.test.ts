import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { HikeInput } from "./hikeSchema";
import {
  addHike,
  checkStore,
  getStorePaths,
  listHikes,
  removeHike,
  resetStoreStateForTests,
  StoreCorruptError,
} from "./hikeStore";

const originalDataDir = process.env.DATA_DIR;
const originalSeedFile = process.env.SEED_FILE;

let dir: string;

function hikeInput(overrides: Partial<HikeInput> = {}): HikeInput {
  return {
    name: "Test hike",
    date: "2025-05-01",
    difficulty: "easy",
    status: "done",
    position: [47.5, 11.5],
    photos: [],
    ...overrides,
  };
}

async function writeStore(contents: unknown): Promise<void> {
  await writeFile(
    getStorePaths().file,
    typeof contents === "string" ? contents : JSON.stringify(contents, null, 2),
    "utf8"
  );
}

async function readStore(): Promise<unknown> {
  return JSON.parse(await readFile(getStorePaths().file, "utf8"));
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "dirndltrails-store-"));
  process.env.DATA_DIR = dir;
  delete process.env.SEED_FILE;
  resetStoreStateForTests();
});

afterEach(async () => {
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;

  if (originalSeedFile === undefined) delete process.env.SEED_FILE;
  else process.env.SEED_FILE = originalSeedFile;

  resetStoreStateForTests();
  await rm(dir, { recursive: true, force: true });
});

describe("bootstrap", () => {
  it("seeds the data file from hikes.seed.json on first run", async () => {
    const seeded = [
      { ...hikeInput({ name: "Seeded hike" }), id: "seed-1" },
      {
        name: "Legacy hike",
        date: "2024/07/01",
        difficulty: "hard",
        position: [47, 11],
      },
    ];
    await writeFile(
      getStorePaths().seed,
      JSON.stringify(seeded, null, 2),
      "utf8"
    );

    const hikes = await listHikes();

    expect(hikes.map((hike) => hike.name)).toEqual(["Seeded hike", "Legacy hike"]);
    expect(hikes[1]).toMatchObject({
      id: expect.any(String),
      date: "2024-07-01",
      difficulty: "hard",
      status: "done",
      photos: [],
    });
    expect(await readStore()).toHaveLength(2);
  });

  it("starts empty when no seed file exists", async () => {
    process.env.SEED_FILE = path.join(dir, "missing-seed.json");

    await expect(listHikes()).resolves.toEqual([]);
    await expect(readStore()).resolves.toEqual([]);
  });

  it("does not overwrite an existing data file", async () => {
    await writeStore([{ ...hikeInput({ name: "Existing" }), id: "existing-1" }]);
    await writeFile(
      getStorePaths().seed,
      JSON.stringify([{ ...hikeInput({ name: "Seed" }), id: "seed-1" }]),
      "utf8"
    );

    const hikes = await listHikes();

    expect(hikes.map((hike) => hike.name)).toEqual(["Existing"]);
  });

  it("ignores malformed seed files and starts empty", async () => {
    process.env.SEED_FILE = path.join(dir, "broken-seed.json");
    await writeFile(process.env.SEED_FILE, "{not json", "utf8");

    await expect(listHikes()).resolves.toEqual([]);
  });
});

describe("writes", () => {
  it("appends a hike and persists it", async () => {
    process.env.SEED_FILE = path.join(dir, "missing-seed.json");

    const created = await addHike(hikeInput({ name: "New hike" }));

    expect(created.id).toEqual(expect.any(String));
    expect(await listHikes()).toEqual([created]);
    expect(await readStore()).toEqual([created]);
  });

  it("removes a hike and reports whether anything changed", async () => {
    process.env.SEED_FILE = path.join(dir, "missing-seed.json");
    const created = await addHike(hikeInput());

    await expect(removeHike(created.id)).resolves.toEqual({
      deleted: true,
      id: created.id,
    });
    await expect(removeHike(created.id)).resolves.toEqual({
      deleted: false,
      id: created.id,
    });
    await expect(listHikes()).resolves.toEqual([]);
  });

  it("keeps concurrent writes", async () => {
    process.env.SEED_FILE = path.join(dir, "missing-seed.json");

    await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        addHike(hikeInput({ name: `Hike ${index}` }))
      )
    );

    const hikes = await listHikes();
    expect(hikes).toHaveLength(5);
    expect(hikes.map((hike) => hike.name).sort()).toEqual([
      "Hike 0",
      "Hike 1",
      "Hike 2",
      "Hike 3",
      "Hike 4",
    ]);
  });

  it("leaves no temporary files behind", async () => {
    process.env.SEED_FILE = path.join(dir, "missing-seed.json");
    await addHike(hikeInput());

    const entries = await readdir(dir);
    expect(entries.filter((entry) => entry.endsWith(".tmp"))).toEqual([]);
  });
});

describe("invalid data", () => {
  it("quarantines invalid records and keeps the valid ones", async () => {
    process.env.SEED_FILE = path.join(dir, "missing-seed.json");
    const valid = { ...hikeInput({ name: "Valid hike" }), id: "valid-1" };
    const invalid = { name: "", date: "nope", position: [999, 999] };
    await writeStore([valid, invalid]);

    const hikes = await listHikes();

    expect(hikes.map((hike) => hike.name)).toEqual(["Valid hike"]);

    const quarantineFiles = await readdir(getStorePaths().quarantineDir);
    expect(quarantineFiles).toHaveLength(1);

    const quarantined = JSON.parse(
      await readFile(
        path.join(getStorePaths().quarantineDir, quarantineFiles[0]),
        "utf8"
      )
    );
    expect(quarantined.source).toBe(getStorePaths().file);
    expect(quarantined.records).toHaveLength(1);
    expect(quarantined.records[0].index).toBe(1);
    expect(quarantined.records[0].record).toEqual(invalid);
    expect(quarantined.records[0].reason).toContain("Name is required");
  });

  it("does not write a new quarantine file for repeated reads", async () => {
    const invalid = { name: "" };
    await writeStore([invalid]);

    await listHikes();
    // Simulate another route bundle (or process) reading the same file.
    resetStoreStateForTests();
    await listHikes();

    const quarantineFiles = await readdir(getStorePaths().quarantineDir);
    expect(quarantineFiles).toHaveLength(1);
  });

  it("keeps separate quarantine files for different invalid records", async () => {
    await writeStore([{ name: "" }]);
    await listHikes();

    await writeStore([{ name: "x", date: "nope", position: [999, 999] }]);
    resetStoreStateForTests();
    await listHikes();

    const quarantineFiles = await readdir(getStorePaths().quarantineDir);
    expect(quarantineFiles).toHaveLength(2);
  });

  it("drops quarantined records on the next write", async () => {
    process.env.SEED_FILE = path.join(dir, "missing-seed.json");
    await writeStore([
      { ...hikeInput({ name: "Valid hike" }), id: "valid-1" },
      { name: "" },
    ]);

    const created = await addHike(hikeInput({ name: "Another hike" }));

    const stored = (await readStore()) as Array<{ name: string }>;
    expect(stored.map((hike) => hike.name)).toEqual([
      "Valid hike",
      created.name,
    ]);
  });

  it("refuses to read a corrupt file and leaves it untouched", async () => {
    await writeStore("{not json");

    await expect(listHikes()).rejects.toBeInstanceOf(StoreCorruptError);
    expect(await readFile(getStorePaths().file, "utf8")).toBe("{not json");
  });

  it("rejects a data file that is not an array", async () => {
    await writeStore({ hikes: [] });

    await expect(listHikes()).rejects.toBeInstanceOf(StoreCorruptError);
  });
});

describe("checkStore", () => {
  it("reports when the store is healthy", async () => {
    process.env.SEED_FILE = path.join(dir, "missing-seed.json");

    await expect(checkStore()).resolves.toEqual({ ok: true });
  });

  it("reports corruption with a reason", async () => {
    await writeStore("{not json");

    const result = await checkStore();

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("not valid JSON");
  });
});
