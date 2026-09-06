/**
 * List and create creatures.
 *
 * GET  /api/creatures          every creature (the community gallery)
 * GET  /api/creatures?mine=1   just this user's
 * POST /api/creatures          create one
 *
 * Replaces `getAllPokemon`, `getMyPokemon` and `createPokemon` from the old
 * Supabase service.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { desc, eq } from "drizzle-orm";
import { db } from "./_lib/db.js";
import { customPokemon, users, type InsertCustomPokemon } from "./_lib/schema.js";
import { requireUser } from "./_lib/auth.js";

/** Only these are writable. Anything else in the body is ignored. */
const WRITABLE = [
  "name", "pokedexNumber", "category", "typePrimary", "typeSecondary", "color",
  "pokedexEntry", "physicalAppearance", "imageDescription",
  "heightValue", "heightUnit", "weightValue", "weightUnit", "shape",
  "hp", "attack", "defense", "specialAttack", "specialDefense", "speed",
  "ability1Name", "ability1Description", "ability2Name", "ability2Description",
  "hiddenAbilityName", "hiddenAbilityDescription",
  "evolutionStage", "evolvesFrom", "evolvesInto", "evolutionMethod",
  "eggGroup1", "eggGroup2", "genderRatioMale", "genderRatioFemale",
  "isGenderless", "eggCycles", "catchRate", "baseFriendship", "growthRate",
  "evYield", "originalDrawingUrl", "aiGeneratedImageUrl",
  "levelUpMoves", "tmMoves", "eggMoves",
] as const;

export function pickWritable(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const key of WRITABLE) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

export default requireUser(async (req: VercelRequest, res: VercelResponse, user) => {
  try {
    if (req.method === "GET") {
      const mine = req.query.mine === "1" || req.query.mine === "true";
      const rows = mine
        ? await db.select().from(customPokemon)
            .where(eq(customPokemon.userId, user.id))
            .orderBy(desc(customPokemon.createdAt))
        : await db.select().from(customPokemon).orderBy(desc(customPokemon.createdAt));

      // The gallery shows who made each one.
      const creators = new Map(
        (await db.select({ id: users.id, username: users.username }).from(users))
          .map((u) => [u.id, u.username]),
      );
      res.status(200).json(
        rows.map((r) => ({ ...r, username: creators.get(r.userId) ?? null })),
      );
      return;
    }

    if (req.method === "POST") {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const values = pickWritable(body) as Partial<InsertCustomPokemon>;

      if (typeof values.name !== "string" || !values.name.trim()) {
        res.status(400).json({ error: "Your creature needs a name" });
        return;
      }
      if (typeof values.typePrimary !== "string" || !values.typePrimary.trim()) {
        res.status(400).json({ error: "Your creature needs at least one type" });
        return;
      }

      const [created] = await db
        .insert(customPokemon)
        .values({ ...values, userId: user.id } as InsertCustomPokemon)
        .returning();

      res.status(201).json(created);
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("creatures error:", error?.message);
    res.status(500).json({ error: "Something went wrong saving that" });
  }
});
