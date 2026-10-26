import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { hikeSchema, type Hike, type HikeInput } from "./hikeSchema";

const DATA_FILE = path.join(process.cwd(), "data", "hikes.json");

type RawHike = Record<string, unknown>;

/**
 * Accepts older entries (string photos, slash-separated dates, missing id or
 * difficulty) and upgrades them to the current shape on read.
 */
function normalize(raw: RawHike): Hike {
  const rawPhotos = raw.photos;
  const photos = Array.isArray(rawPhotos)
    ? rawPhotos
    : typeof rawPhotos === "string" && rawPhotos.length > 0
      ? [rawPhotos]
      : [];

  const date =
    typeof raw.date === "string" ? raw.date.replaceAll("/", "-") : raw.date;

  return hikeSchema.parse({
    ...raw,
    id: raw.id ?? randomUUID(),
    date,
    difficulty: raw.difficulty ?? "moderate",
    photos,
  });
}

async function readHikes(): Promise<Hike[]> {
  const contents = await fs.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(contents);

  if (!Array.isArray(parsed)) {
    throw new Error("data/hikes.json must contain an array of hikes");
  }

  return parsed.map((entry) => normalize(entry as RawHike));
}

/** Write to a temp file and rename so a crash can't leave a half-written file. */
async function writeHikes(hikes: Hike[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });

  const temporaryFile = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.writeFile(
    temporaryFile,
    `${JSON.stringify(hikes, null, 2)}\n`,
    "utf8"
  );
  await fs.rename(temporaryFile, DATA_FILE);
}

export async function listHikes(): Promise<Hike[]> {
  return readHikes();
}

// Serialize writes so two concurrent requests can't clobber each other.
let writeQueue: Promise<unknown> = Promise.resolve();

export function addHike(input: HikeInput): Promise<Hike> {
  const run = writeQueue.then(async () => {
    const hikes = await readHikes();
    const hike: Hike = {
      ...input,
      photos: input.photos ?? [],
      id: randomUUID(),
    };

    hikes.push(hike);
    await writeHikes(hikes);
    return hike;
  });

  writeQueue = run.catch(() => undefined);
  return run;
}

export function removeHike(
  id: string
): Promise<{ deleted: boolean; id: string }> {
  const run = writeQueue.then(async () => {
    const hikes = await readHikes();
    const initialLength = hikes.length;
    const filtered = hikes.filter((hike) => hike.id !== id);

    if (filtered.length === initialLength) {
      return { deleted: false, id };
    }

    await writeHikes(filtered);
    return { deleted: true, id };
  });

  writeQueue = run.catch(() => undefined);
  return run;
}
