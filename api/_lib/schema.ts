/**
 * The slice of the shared Neon database PokeMaker touches.
 *
 * PokeTracker owns the canonical schema (`shared/schema.ts` in that repo). This
 * is a deliberate, minimal restatement of the two tables PokeMaker needs, so
 * the two apps can share one database without either depending on the other's
 * build. If you change a column here, change it there.
 */

import {
  pgTable,
  varchar,
  text,
  integer,
  boolean,
  real,
  timestamp,
  jsonb,
  uuid,
  serial,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email"),
  username: varchar("username", { length: 50 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customPokemon = pgTable("custom_pokemon", {
  id: uuid("id").primaryKey().defaultRandom(),
  dexNumber: serial("dex_number").notNull(),
  userId: varchar("user_id").notNull(),

  name: varchar("name", { length: 100 }).notNull(),
  pokedexNumber: integer("pokedex_number"),
  physicalAppearance: text("physical_appearance"),
  imageDescription: text("image_description"),
  category: varchar("category", { length: 100 }),
  typePrimary: varchar("type_primary", { length: 20 }).notNull(),
  typeSecondary: varchar("type_secondary", { length: 20 }),
  color: varchar("color", { length: 50 }),
  pokedexEntry: text("pokedex_entry"),

  heightValue: real("height_value"),
  heightUnit: varchar("height_unit", { length: 10 }),
  weightValue: real("weight_value"),
  weightUnit: varchar("weight_unit", { length: 10 }),
  shape: varchar("shape", { length: 50 }),

  hp: integer("hp"),
  attack: integer("attack"),
  defense: integer("defense"),
  specialAttack: integer("special_attack"),
  specialDefense: integer("special_defense"),
  speed: integer("speed"),

  ability1Name: varchar("ability_1_name", { length: 100 }),
  ability1Description: text("ability_1_description"),
  ability2Name: varchar("ability_2_name", { length: 100 }),
  ability2Description: text("ability_2_description"),
  hiddenAbilityName: varchar("hidden_ability_name", { length: 100 }),
  hiddenAbilityDescription: text("hidden_ability_description"),

  evolutionStage: varchar("evolution_stage", { length: 20 }),
  evolvesFrom: varchar("evolves_from", { length: 100 }),
  evolvesInto: varchar("evolves_into", { length: 100 }),
  evolutionMethod: text("evolution_method"),

  eggGroup1: varchar("egg_group_1", { length: 50 }),
  eggGroup2: varchar("egg_group_2", { length: 50 }),
  genderRatioMale: integer("gender_ratio_male"),
  genderRatioFemale: integer("gender_ratio_female"),
  isGenderless: boolean("is_genderless").default(false),
  eggCycles: integer("egg_cycles"),
  catchRate: integer("catch_rate"),
  baseFriendship: integer("base_friendship"),
  growthRate: varchar("growth_rate", { length: 30 }),
  evYield: jsonb("ev_yield"),

  originalDrawingUrl: text("original_drawing_url"),
  aiGeneratedImageUrl: text("ai_generated_image_url"),

  levelUpMoves: jsonb("level_up_moves"),
  tmMoves: jsonb("tm_moves"),
  eggMoves: jsonb("egg_moves"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type CustomPokemon = typeof customPokemon.$inferSelect;
export type InsertCustomPokemon = typeof customPokemon.$inferInsert;
