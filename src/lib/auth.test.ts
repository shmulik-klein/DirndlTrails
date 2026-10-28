import { describe, expect, it } from "vitest";

import { hashPassword, hashPasswordSync, verifyPassword } from "./auth";
import { PASSWORD_HASH_FORMAT } from "./env";

const PASSWORD = "correct horse battery staple";

describe("password hashing", () => {
  it("produces a dotenv-safe scrypt hash", async () => {
    const hash = await hashPassword(PASSWORD);

    expect(hash).toMatch(/^scrypt:32768:8:1:/);
    expect(hash).toMatch(PASSWORD_HASH_FORMAT);
    expect(hash).not.toContain("$");
  });

  it("verifies the matching password (async and sync hashes)", async () => {
    const asyncHash = await hashPassword(PASSWORD);
    const syncHash = hashPasswordSync(PASSWORD);

    await expect(verifyPassword(PASSWORD, asyncHash)).resolves.toBe(true);
    await expect(verifyPassword(PASSWORD, syncHash)).resolves.toBe(true);
  });

  it("rejects a different password", async () => {
    const hash = await hashPassword(PASSWORD);

    await expect(verifyPassword(`${PASSWORD}!`, hash)).resolves.toBe(false);
    await expect(verifyPassword("", hash)).resolves.toBe(false);
  });

  it("rejects malformed hashes without throwing", async () => {
    await expect(verifyPassword(PASSWORD, "")).resolves.toBe(false);
    await expect(verifyPassword(PASSWORD, "not-a-hash")).resolves.toBe(false);
    await expect(
      verifyPassword(PASSWORD, "scrypt:32768:8:1:onlyfiveparts")
    ).resolves.toBe(false);
  });

  it("rejects legacy `$`-separated hashes (dotenv-expand corrupts them)", async () => {
    await expect(
      verifyPassword(PASSWORD, "scrypt$32768$8$1$c2FsdA$aGFzaA")
    ).resolves.toBe(false);
  });
});

describe("PASSWORD_HASH_FORMAT", () => {
  it("accepts the generated format", () => {
    expect(PASSWORD_HASH_FORMAT.test(hashPasswordSync(PASSWORD))).toBe(true);
  });

  it("rejects values that dotenv-expand would mangle", () => {
    expect(
      PASSWORD_HASH_FORMAT.test("scrypt$32768$8$1$c2FsdA$aGFzaA")
    ).toBe(false);
    expect(PASSWORD_HASH_FORMAT.test("scrypt:32768:8:1:abc")).toBe(false);
  });
});
