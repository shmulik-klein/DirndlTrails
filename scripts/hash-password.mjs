#!/usr/bin/env node
/**
 * Generates an ADMIN_PASSWORD_HASH value for .env.production.
 *
 *   npm run hash-password -- "my strong password"
 *   npm run hash-password            # prompts on the terminal
 *
 * Format must stay in sync with src/lib/auth.ts:
 *   scrypt$N$r$p$salt(base64url)$hash(base64url)
 */
import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const N = 32768;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const MAX_MEM = 64 * 1024 * 1024;
const SALT_LENGTH = 16;

async function readPassword() {
  const fromArgv = process.argv.slice(2).join(" ").trim();
  if (fromArgv) return fromArgv;

  if (!stdin.isTTY) {
    const chunks = [];
    for await (const chunk of stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question("Admin password: ");
    return answer;
  } finally {
    rl.close();
  }
}

const password = await readPassword();

if (!password || password.length < 12) {
  console.error(
    "Refusing to hash a password shorter than 12 characters. Use a long, unique passphrase."
  );
  process.exit(1);
}

const salt = randomBytes(SALT_LENGTH);
const hash = scryptSync(password, salt, KEY_LENGTH, {
  N,
  r: R,
  p: P,
  maxmem: MAX_MEM,
});

const encoded = [
  "scrypt",
  N,
  R,
  P,
  salt.toString("base64url"),
  hash.toString("base64url"),
].join("$");

console.log(`\nADMIN_PASSWORD_HASH=${encoded}\n`);
console.log(
  "Store this in .env.production (chmod 600). It cannot be reversed — generate a new one if lost."
);
