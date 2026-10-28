import {
  randomBytes,
  scrypt as scryptCallback,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

import { SignJWT, jwtVerify } from "jose";
import type { NextApiRequest, NextApiResponse } from "next";

import { getServerEnv, isProduction, PASSWORD_HASH_FORMAT } from "./env";

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions
) => Promise<Buffer>;

// OWASP-recommended scrypt parameters (N=2^15, r=8, p=1).
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const MAX_MEM = 64 * 1024 * 1024;
const SALT_LENGTH = 16;
const HASH_PREFIX = "scrypt";

const SESSION_ISSUER = "dirndltrails";
const SESSION_AUDIENCE = "dirndltrails-admin";
const SESSION_ROLE = "admin";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function scryptOptions(): ScryptOptions {
  return { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: MAX_MEM };
}

/**
 * Encodes `scrypt:N:r:p:salt:hash` (N/r/p decimal, salt/hash base64url).
 *
 * Colons are used instead of the more common `$` separators because Next.js
 * runs `dotenv-expand` over `.env*` files: a `$`-separated hash would be
 * silently rewritten (`$32768` is treated as a variable reference) before it
 * ever reaches the app.
 */
function encodeHash(salt: Buffer, derived: Buffer): string {
  return [
    HASH_PREFIX,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join(":");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password, salt, KEY_LENGTH, scryptOptions());

  return encodeHash(salt, derived);
}

/** Synchronous variant used by the CLI helper (`npm run hash-password`). */
export function hashPasswordSync(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const derived = scryptSync(password, salt, KEY_LENGTH, scryptOptions());

  return encodeHash(salt, derived);
}

type ParsedHash = {
  n: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
};

function parsePasswordHash(stored: string): ParsedHash | null {
  if (!PASSWORD_HASH_FORMAT.test(stored)) return null;

  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== HASH_PREFIX) return null;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);

  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return null;
  }

  try {
    const salt = Buffer.from(parts[4], "base64url");
    const hash = Buffer.from(parts[5], "base64url");
    if (salt.length === 0 || hash.length === 0) return null;
    return { n, r, p, salt, hash };
  } catch {
    return null;
  }
}

/**
 * Verifies a password against a stored scrypt hash. Malformed hashes still
 * perform a dummy derivation so failures take roughly the same time.
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parsed = parsePasswordHash(stored);

  if (!parsed) {
    await scrypt(password, randomBytes(SALT_LENGTH), KEY_LENGTH, scryptOptions());
    return false;
  }

  const derived = await scrypt(password, parsed.salt, parsed.hash.length, {
    N: parsed.n,
    r: parsed.r,
    p: parsed.p,
    maxmem: MAX_MEM,
  });

  if (derived.length !== parsed.hash.length) return false;
  return timingSafeEqual(derived, parsed.hash);
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  return verifyPassword(password, getServerEnv().ADMIN_PASSWORD_HASH);
}

export function sessionCookieName(): string {
  return isProduction() ? "__Host-dt_session" : "dt_session";
}

function sessionKey(): Uint8Array {
  return new TextEncoder().encode(getServerEnv().SESSION_SECRET);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: SESSION_ROLE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(sessionKey());
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<boolean> {
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, sessionKey(), {
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });
    return payload.role === SESSION_ROLE;
  } catch {
    return false;
  }
}

export type SessionCookie = {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    secure: boolean;
    sameSite: "lax";
    path: "/";
    maxAge: number;
  };
};

export function createSessionCookie(token: string): SessionCookie {
  return {
    name: sessionCookieName(),
    value: token,
    options: {
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
  };
}

export function serializeSessionCookie(cookie: SessionCookie): string {
  const parts = [
    `${cookie.name}=${encodeURIComponent(cookie.value)}`,
    `Path=${cookie.options.path}`,
    `Max-Age=${cookie.options.maxAge}`,
    `SameSite=Lax`,
    "HttpOnly",
  ];

  if (cookie.options.secure) parts.push("Secure");

  return parts.join("; ");
}

export function createExpiredSessionCookie(): SessionCookie {
  return {
    name: sessionCookieName(),
    value: "",
    options: {
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    },
  };
}

export function parseCookieHeader(
  header: string | undefined
): Record<string, string> {
  if (!header) return {};

  const cookies: Record<string, string> = {};

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;

    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!key) continue;

    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }

  return cookies;
}

export async function isAdminCookieHeader(
  header: string | undefined
): Promise<boolean> {
  const token = parseCookieHeader(header)[sessionCookieName()];
  return verifySessionToken(token);
}

export async function isAdminRequest(req: NextApiRequest): Promise<boolean> {
  return isAdminCookieHeader(req.headers.cookie);
}

/** Writes a 401 and returns false when the request is not authenticated. */
export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<boolean> {
  if (await isAdminRequest(req)) return true;

  res.setHeader("Cache-Control", "no-store");
  res.status(401).json({ error: "Unauthorized" });
  return false;
}

/**
 * Defence in depth on top of SameSite=Lax cookies: reject cross-origin
 * browser requests. Non-browser clients (no Origin header) still need a valid
 * session cookie, so this is safe to allow.
 */
export function isSameOriginRequest(req: NextApiRequest): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(getServerEnv().APP_ORIGIN).origin;
  } catch {
    return false;
  }
}
