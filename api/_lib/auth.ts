/**
 * Session handling for PokeMaker.
 *
 * Accounts live in the shared `users` table, so the same username and password
 * work in PokeTracker. Sessions themselves are not shared: the two apps sit on
 * different domains, so a cookie set by one is invisible to the other. Each
 * signs its own.
 *
 * The token is a signed value rather than a database row, which keeps this to
 * one round trip on a serverless function and avoids a session table PokeMaker
 * would otherwise have to manage.
 */

import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./db.js";
import { users, type User } from "./schema.js";

const COOKIE_NAME = "pokemaker.sid";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET must be set");
  return value;
}

const sign = (payload: string) =>
  createHmac("sha256", secret()).update(payload).digest("base64url");

/** `<userId>.<expiryEpochSeconds>.<signature>` */
export function createSessionToken(userId: string): string {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `${userId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token?: string | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expires, signature] = parts;

  const expected = Buffer.from(sign(`${userId}.${expires}`));
  const actual = Buffer.from(signature);
  // Constant-time so the signature cannot be guessed a byte at a time.
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  if (Number(expires) * 1000 < Date.now()) return null;
  return userId;
}

function parseCookies(header?: string): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((part) => {
      const index = part.indexOf("=");
      return index === -1
        ? [part.trim(), ""]
        : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
    }),
  );
}

export function setSessionCookie(res: VercelResponse, token: string) {
  res.setHeader("Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`);
}

export function clearSessionCookie(res: VercelResponse) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

/** The signed-in user, or null. Verifies the account still exists. */
export async function currentUser(req: VercelRequest): Promise<User | null> {
  const cookies = parseCookies(req.headers.cookie);
  const userId = readSessionToken(cookies[COOKIE_NAME]);
  if (!userId) return null;
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user ?? null;
}

/** Wrap a handler so it only runs for a signed-in user. */
export function requireUser(
  handler: (req: VercelRequest, res: VercelResponse, user: User) => Promise<void> | void,
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const user = await currentUser(req);
    if (!user) {
      res.status(401).json({ error: "Please sign in" });
      return;
    }
    return handler(req, res, user);
  };
}

export async function verifyLogin(username: string, password: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.username, username.trim()));
  if (!user?.passwordHash) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export { randomUUID };
