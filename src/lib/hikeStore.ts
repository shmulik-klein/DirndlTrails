import { createHash, randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

import lockfile from "proper-lockfile";
import { ZodError } from "zod";

import { hikeSchema, type Hike, type HikeInput } from "./hikeSchema";
import { logger } from "./logger";

const DEFAULT_DATA_DIR = "./data";
const DATA_FILENAME = "hikes.json";
const SEED_FILENAME = "hikes.seed.json";
const LOCK_FILENAME = ".store.lock";
const QUARANTINE_DIRNAME = "quarantine";
const SEEDED_SEED_PATH = path.join("data", SEED_FILENAME);

// Writes take milliseconds; anything older than this belongs to a dead process.
const LOCK_STALE_MS = 20_000;
const LOCK_RETRIES = {
  retries: 10,
  factor: 1.5,
  minTimeout: 25,
  maxTimeout: 500,
};

export type StorePaths = {
  dir: string;
  file: string;
  seed: string;
  lock: string;
  quarantineDir: string;
};

/** Raised when the data file exists but cannot be understood. The file is left untouched. */
export class StoreCorruptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreCorruptError";
  }
}

/**
 * Resolves the storage layout on every call so `DATA_DIR` can be changed by
 * tests (and so a relative path always means "relative to the app root").
 */
export function getStorePaths(): StorePaths {
  const configured = process.env.DATA_DIR?.trim() || DEFAULT_DATA_DIR;
  const dir = path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);

  return {
    dir,
    file: path.join(dir, DATA_FILENAME),
    seed: path.join(dir, SEED_FILENAME),
    lock: path.join(dir, LOCK_FILENAME),
    quarantineDir: path.join(dir, QUARANTINE_DIRNAME),
  };
}

type RawHike = Record<string, unknown>;

type QuarantinedRecord = {
  index: number;
  reason: string;
  record: unknown;
};

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

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function describeError(error: unknown): string {
  if (error instanceof ZodError) {
    return (
      error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ") || "Invalid record"
    );
  }

  return error instanceof Error ? error.message : String(error);
}

function serialize(hikes: Hike[]): string {
  return `${JSON.stringify(hikes, null, 2)}\n`;
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await fs.access(file, fsConstants.F_OK);
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

/**
 * Writes to a temp file in the same directory, fsyncs it, renames it over the
 * target and fsyncs the directory. A crash or power loss leaves either the old
 * or the new file, never a truncated one.
 */
async function writeFileAtomic(
  target: string,
  contents: string
): Promise<void> {
  const dir = path.dirname(target);
  await fs.mkdir(dir, { recursive: true });

  const temporary = path.join(
    dir,
    `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`
  );

  const handle = await fs.open(temporary, "w");
  try {
    await handle.writeFile(contents, "utf8");
    await handle.sync();
  } catch (error) {
    await handle.close().catch(() => undefined);
    await fs.rm(temporary, { force: true });
    throw error;
  }
  await handle.close();

  try {
    await fs.rename(temporary, target);
  } catch (error) {
    await fs.rm(temporary, { force: true });
    throw error;
  }

  await syncDirectory(dir);
}

/** Makes the rename itself durable. Not supported on every platform/filesystem. */
async function syncDirectory(dir: string): Promise<void> {
  let handle: Awaited<ReturnType<typeof fs.open>> | undefined;

  try {
    handle = await fs.open(dir, "r");
    await handle.sync();
  } catch (error) {
    logger.debug({ err: error, dir }, "Directory fsync skipped");
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

/**
 * Serialises read-modify-write cycles across processes using a lock file in
 * the data directory. In-process calls are already serialised by `writeQueue`,
 * but a second container or a maintenance script is not.
 */
async function withStoreLock<T>(run: () => Promise<T>): Promise<T> {
  const { dir, lock } = getStorePaths();
  await fs.mkdir(dir, { recursive: true });

  // proper-lockfile requires the lock target to exist.
  await fs.writeFile(lock, "", { flag: "a" });

  const release = await lockfile.lock(lock, {
    stale: LOCK_STALE_MS,
    retries: LOCK_RETRIES,
    realpath: false,
  });

  try {
    return await run();
  } finally {
    await release().catch((error) => {
      logger.warn({ err: error }, "Failed to release hike store lock");
    });
  }
}

async function parseHikes(contents: string): Promise<Hike[]> {
  const { file } = getStorePaths();

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new StoreCorruptError(`${file} is not valid JSON`);
  }

  if (!Array.isArray(parsed)) {
    throw new StoreCorruptError(`${file} must contain an array of hikes`);
  }

  const hikes: Hike[] = [];
  const invalid: QuarantinedRecord[] = [];

  parsed.forEach((entry, index) => {
    try {
      hikes.push(normalize(entry as RawHike));
    } catch (error) {
      invalid.push({ index, reason: describeError(error), record: entry });
    }
  });

  if (invalid.length > 0) {
    await quarantineRecords(invalid);
  }

  return hikes;
}

// Guards against writing a fresh quarantine file on every read of the same
// still-broken data file. Reset in tests and on process start.
const quarantinedSignatures = new Set<string>();

async function quarantineRecords(
  records: QuarantinedRecord[]
): Promise<void> {
  const signature = JSON.stringify(records.map((entry) => entry.record));
  if (quarantinedSignatures.has(signature)) return;
  quarantinedSignatures.add(signature);

  const { file, quarantineDir } = getStorePaths();
  // Content-addressed name: other route bundles and other processes see their
  // own in-memory cache, so the filename is what keeps duplicates away.
  const digest = createHash("sha256")
    .update(signature)
    .digest("hex")
    .slice(0, 16);
  const target = path.join(quarantineDir, `hikes-${digest}.json`);

  if (await fileExists(target)) return;

  const payload = {
    source: file,
    quarantinedAt: new Date().toISOString(),
    records,
  };

  try {
    await writeFileAtomic(target, `${JSON.stringify(payload, null, 2)}\n`);
    logger.warn(
      { count: records.length, file: target },
      "Quarantined invalid hike records; they are excluded from the map"
    );
  } catch (error) {
    // Losing the quarantine copy must not make the rest of the store unusable.
    logger.error(
      { err: error, count: records.length },
      "Failed to write quarantine file"
    );
  }
}

async function readStoreFile(): Promise<Hike[]> {
  const { file } = getStorePaths();
  const contents = await fs.readFile(file, "utf8");
  return parseHikes(contents);
}

async function readSeedFile(file: string): Promise<Hike[] | null> {
  let contents: string;

  try {
    contents = await fs.readFile(file, "utf8");
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    logger.warn({ file }, "Ignoring seed file: not valid JSON");
    return null;
  }

  if (!Array.isArray(parsed)) {
    logger.warn({ file }, "Ignoring seed file: expected an array of hikes");
    return null;
  }

  const hikes: Hike[] = [];
  for (const [index, entry] of parsed.entries()) {
    try {
      hikes.push(normalize(entry as RawHike));
    } catch (error) {
      logger.warn(
        { file, index, reason: describeError(error) },
        "Skipping invalid seed record"
      );
    }
  }

  return hikes;
}

function seedCandidates(): string[] {
  const { seed } = getStorePaths();
  const override = process.env.SEED_FILE?.trim();

  if (override) {
    return [path.isAbsolute(override) ? override : path.resolve(override)];
  }

  // In Docker DATA_DIR points at a volume while the shipped seed stays in the
  // image's ./data directory, so look in both places.
  const baked = path.resolve(process.cwd(), SEEDED_SEED_PATH);
  return seed === baked ? [seed] : [seed, baked];
}

/**
 * Creates the data file on first run: from `data/hikes.seed.json` when
 * available, otherwise an empty list. Runs under the store lock so that two
 * processes starting at once cannot both seed.
 */
async function bootstrapStore(): Promise<void> {
  const { dir, file } = getStorePaths();
  await fs.mkdir(dir, { recursive: true });

  await withStoreLock(async () => {
    if (await fileExists(file)) return;

    for (const candidate of seedCandidates()) {
      const seed = await readSeedFile(candidate);

      if (seed) {
        await writeFileAtomic(file, serialize(seed));
        logger.info(
          { file, seed: candidate, count: seed.length },
          "Bootstrapped hike store from seed"
        );
        return;
      }
    }

    await writeFileAtomic(file, serialize([]));
    logger.warn({ file }, "Bootstrapped empty hike store (no seed found)");
  });
}

async function ensureStore(): Promise<void> {
  if (await fileExists(getStorePaths().file)) return;
  await bootstrapStore();
}

export async function listHikes(): Promise<Hike[]> {
  await ensureStore();
  return readStoreFile();
}

/** Used by the health endpoint to verify the data file is readable + writable. */
export async function checkStore(): Promise<{
  ok: boolean;
  reason?: string;
}> {
  try {
    await ensureStore();
    await readStoreFile();
    await fs.access(getStorePaths().dir, fsConstants.W_OK);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Unknown storage error",
    };
  }
}

// Serialize writes so two concurrent requests can't clobber each other.
let writeQueue: Promise<unknown> = Promise.resolve();

type UpdateOutcome<T> = {
  hikes?: Hike[];
  result: T;
};

async function updateHikes<T>(
  update: (hikes: Hike[]) => UpdateOutcome<T>
): Promise<T> {
  await ensureStore();

  return withStoreLock(async () => {
    const current = await readStoreFile();
    const outcome = update(current);

    if (outcome.hikes) {
      await writeFileAtomic(getStorePaths().file, serialize(outcome.hikes));
    }

    return outcome.result;
  });
}

export function addHike(input: HikeInput): Promise<Hike> {
  const hike: Hike = {
    ...input,
    photos: input.photos ?? [],
    id: randomUUID(),
  };

  const run = writeQueue.then(() =>
    updateHikes((hikes) => ({ hikes: [...hikes, hike], result: hike }))
  );

  writeQueue = run.catch(() => undefined);
  return run;
}

export function removeHike(
  id: string
): Promise<{ deleted: boolean; id: string }> {
  const run = writeQueue.then(() =>
    updateHikes((hikes) => {
      const filtered = hikes.filter((hike) => hike.id !== id);

      if (filtered.length === hikes.length) {
        return { result: { deleted: false, id } };
      }

      return { hikes: filtered, result: { deleted: true, id } };
    })
  );

  writeQueue = run.catch(() => undefined);
  return run;
}

/** Test helper: forget in-process caches after changing `DATA_DIR`/`SEED_FILE`. */
export function resetStoreStateForTests(): void {
  writeQueue = Promise.resolve();
  quarantinedSignatures.clear();
}
