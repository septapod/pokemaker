/**
 * Sign in, sign out, and "who am I".
 *
 * Accounts are the shared ones in the Neon `users` table, so Aza's PokeTracker
 * login works here unchanged.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  verifyLogin,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  currentUser,
} from "./_lib/auth.js";

const publicUser = (u: {
  id: string;
  username: string | null;
  firstName: string | null;
}) => ({ id: u.id, username: u.username, firstName: u.firstName });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const user = await currentUser(req);
      if (!user) {
        res.status(401).json({ error: "Not signed in" });
        return;
      }
      res.status(200).json({ user: publicUser(user) });
      return;
    }

    if (req.method === "POST") {
      const { username, password } = (req.body ?? {}) as Record<string, unknown>;
      if (typeof username !== "string" || typeof password !== "string") {
        res.status(400).json({ error: "Username and password are required" });
        return;
      }
      const user = await verifyLogin(username, password);
      if (!user) {
        // Deliberately identical for a bad username and a bad password.
        res.status(401).json({ error: "That username and password did not match" });
        return;
      }
      setSessionCookie(res, createSessionToken(user.id));
      res.status(200).json({ user: publicUser(user) });
      return;
    }

    if (req.method === "DELETE") {
      clearSessionCookie(res);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("session error:", error?.message);
    res.status(500).json({ error: "Something went wrong signing you in" });
  }
}
