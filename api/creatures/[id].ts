/**
 * One creature: read, edit, delete.
 *
 * Anyone signed in can read any creature (the gallery is shared). Only the
 * creator can change or delete one.
 *
 * Replaces `getPokemonById`, `updatePokemon` and `deletePokemon`.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, eq } from "drizzle-orm";
import { db } from "../_lib/db.js";
import { customPokemon, users } from "../_lib/schema.js";
import { requireUser } from "../_lib/auth.js";
import { pickWritable } from "../creatures.js";

export default requireUser(async (req: VercelRequest, res: VercelResponse, user) => {
  const id = String(req.query.id ?? "");
  if (!id) {
    res.status(400).json({ error: "Missing creature id" });
    return;
  }

  try {
    const [existing] = await db.select().from(customPokemon).where(eq(customPokemon.id, id));
    if (!existing) {
      res.status(404).json({ error: "That creature was not found" });
      return;
    }

    if (req.method === "GET") {
      const [creator] = await db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, existing.userId));
      res.status(200).json({ ...existing, username: creator?.username ?? null });
      return;
    }

    if (existing.userId !== user.id) {
      res.status(403).json({ error: "That one belongs to someone else" });
      return;
    }

    if (req.method === "PATCH" || req.method === "PUT") {
      const values = pickWritable((req.body ?? {}) as Record<string, unknown>);
      const [updated] = await db
        .update(customPokemon)
        .set({ ...values, updatedAt: new Date() })
        .where(and(eq(customPokemon.id, id), eq(customPokemon.userId, user.id)))
        .returning();
      res.status(200).json(updated);
      return;
    }

    if (req.method === "DELETE") {
      // The tracker's collection rows cascade, so deleting a creature also
      // removes it from anyone's collection rather than leaving a dangling row.
      await db
        .delete(customPokemon)
        .where(and(eq(customPokemon.id, id), eq(customPokemon.userId, user.id)));
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("creature error:", error?.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});
