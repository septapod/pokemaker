/**
 * Data layer for PokeMaker.
 *
 * Replaces the Supabase client. That project was deleted, so creatures now live
 * in the same Neon Postgres as PokeTracker, reached through this app's own
 * serverless endpoints under /api. Sharing the database is what lets a creature
 * Aza makes here show up in the tracker with no API between the two.
 *
 * The exported function names match the old service so the pages did not have
 * to be rewritten around a new vocabulary.
 */

import type { Pokemon } from '../types/pokemon.types';

/* ------------------------------------------------------------------ */
/* Transport                                                           */
/* ------------------------------------------------------------------ */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    // Sessions ride on a cookie, so same-origin credentials must be sent.
    credentials: 'same-origin',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = 'Something went wrong. Please try again.';
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // A non-JSON error body is not worth surfacing raw.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

/* ------------------------------------------------------------------ */
/* Row <-> app shape                                                   */
/* ------------------------------------------------------------------ */

/**
 * The API speaks the database's flat column names. The app's `Pokemon` type
 * nests abilities as `{ name, description }`, so translate at this boundary and
 * nowhere else.
 */
function rowToPokemon(row: any): Pokemon {
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    userId: row.userId,
    username: row.username ?? undefined,

    name: row.name,
    pokedexNumber: row.pokedexNumber,
    category: row.category,
    typePrimary: row.typePrimary,
    typeSecondary: row.typeSecondary,
    color: row.color,

    heightValue: row.heightValue,
    heightUnit: row.heightUnit,
    weightValue: row.weightValue,
    weightUnit: row.weightUnit,
    shape: row.shape,
    pokedexEntry: row.pokedexEntry,

    hp: row.hp,
    attack: row.attack,
    defense: row.defense,
    specialAttack: row.specialAttack,
    specialDefense: row.specialDefense,
    speed: row.speed,

    ability1: row.ability1Name
      ? { name: row.ability1Name, description: row.ability1Description || '' }
      : undefined,
    ability2: row.ability2Name
      ? { name: row.ability2Name, description: row.ability2Description || '' }
      : undefined,
    hiddenAbility: row.hiddenAbilityName
      ? { name: row.hiddenAbilityName, description: row.hiddenAbilityDescription || '' }
      : undefined,

    evolutionStage: row.evolutionStage,
    evolvesFrom: row.evolvesFrom,
    evolvesInto: row.evolvesInto,
    evolutionMethod: row.evolutionMethod,
    eggGroup1: row.eggGroup1,
    eggGroup2: row.eggGroup2,
    genderRatioMale: row.genderRatioMale,
    genderRatioFemale: row.genderRatioFemale,
    isGenderless: row.isGenderless,
    eggCycles: row.eggCycles,

    catchRate: row.catchRate,
    baseFriendship: row.baseFriendship,
    growthRate: row.growthRate,
    evYield: row.evYield,

    originalDrawingUrl: row.originalDrawingUrl,
    aiGeneratedImageUrl: row.aiGeneratedImageUrl,
    physicalAppearance: row.physicalAppearance,
    imageDescription: row.imageDescription,

    levelUpMoves: row.levelUpMoves ?? [],
    tmMoves: row.tmMoves ?? [],
    eggMoves: row.eggMoves ?? [],
  } as Pokemon;
}

function pokemonToRow(p: Partial<Pokemon>): Record<string, unknown> {
  return {
    name: p.name,
    pokedexNumber: p.pokedexNumber,
    category: p.category,
    typePrimary: p.typePrimary,
    typeSecondary: p.typeSecondary,
    color: p.color,

    heightValue: p.heightValue,
    heightUnit: p.heightUnit,
    weightValue: p.weightValue,
    weightUnit: p.weightUnit,
    shape: p.shape,
    pokedexEntry: p.pokedexEntry,

    hp: p.hp,
    attack: p.attack,
    defense: p.defense,
    specialAttack: p.specialAttack,
    specialDefense: p.specialDefense,
    speed: p.speed,

    ability1Name: p.ability1?.name,
    ability1Description: p.ability1?.description,
    ability2Name: p.ability2?.name,
    ability2Description: p.ability2?.description,
    hiddenAbilityName: p.hiddenAbility?.name,
    hiddenAbilityDescription: p.hiddenAbility?.description,

    evolutionStage: p.evolutionStage,
    evolvesFrom: p.evolvesFrom,
    evolvesInto: p.evolvesInto,
    evolutionMethod: p.evolutionMethod,
    eggGroup1: p.eggGroup1,
    eggGroup2: p.eggGroup2,
    genderRatioMale: p.genderRatioMale,
    genderRatioFemale: p.genderRatioFemale,
    isGenderless: p.isGenderless,
    eggCycles: p.eggCycles,

    catchRate: p.catchRate,
    baseFriendship: p.baseFriendship,
    growthRate: p.growthRate,
    evYield: p.evYield,

    originalDrawingUrl: p.originalDrawingUrl,
    aiGeneratedImageUrl: p.aiGeneratedImageUrl,
    physicalAppearance: p.physicalAppearance,
    imageDescription: p.imageDescription,

    levelUpMoves: p.levelUpMoves,
    tmMoves: p.tmMoves,
    eggMoves: p.eggMoves,
  };
}

/* ------------------------------------------------------------------ */
/* Creatures                                                           */
/* ------------------------------------------------------------------ */

export async function createPokemon(
  pokemon: Omit<Pokemon, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Pokemon> {
  const row = await request<any>('/api/creatures', {
    method: 'POST',
    body: JSON.stringify(pokemonToRow(pokemon)),
  });
  return rowToPokemon(row);
}

export async function getAllPokemon(): Promise<Pokemon[]> {
  const rows = await request<any[]>('/api/creatures');
  return rows.map(rowToPokemon);
}

export async function getMyPokemon(_userId?: string): Promise<Pokemon[]> {
  // The server already knows who is signed in; the argument is kept so the
  // pages calling this did not need editing.
  const rows = await request<any[]>('/api/creatures?mine=1');
  return rows.map(rowToPokemon);
}

export async function getPokemonById(id: string): Promise<Pokemon> {
  return rowToPokemon(await request<any>(`/api/creatures/${encodeURIComponent(id)}`));
}

export async function getPokemonByName(name: string): Promise<Pokemon | null> {
  const all = await getAllPokemon();
  const match = all.find((p) => p.name?.toLowerCase() === name.trim().toLowerCase());
  return match ?? null;
}

/**
 * Used when one creature references another by name, for an evolution link.
 * Returns the existing creature or null; it no longer invents a placeholder,
 * because a half-filled creature appearing in the tracker would be confusing.
 */
export async function findOrCreatePokemonByName(
  name: string,
  _userId?: string,
): Promise<Pokemon | null> {
  return getPokemonByName(name);
}

export async function updatePokemon(
  id: string,
  pokemon: Partial<Pokemon>,
  _userId?: string,
): Promise<Pokemon> {
  const row = await request<any>(`/api/creatures/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(pokemonToRow(pokemon)),
  });
  return rowToPokemon(row);
}

export async function deletePokemon(id: string, _userId?: string): Promise<void> {
  await request(`/api/creatures/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(file);
  });

/** Uploads to Vercel Blob and returns the public URL. */
export async function uploadImage(file: File, _bucket?: string): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  const { url } = await request<{ url: string }>('/api/upload', {
    method: 'POST',
    body: JSON.stringify({ dataUrl, filename: file.name }),
  });
  return url;
}

/** Copies an image the generator produced at a temporary URL into Blob. */
export async function storeImageFromUrl(sourceUrl: string, filename = 'creature'): Promise<string> {
  const { url } = await request<{ url: string }>('/api/upload', {
    method: 'POST',
    body: JSON.stringify({ sourceUrl, filename }),
  });
  return url;
}

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

export interface SessionUser {
  id: string;
  username: string | null;
  firstName: string | null;
}

export async function signIn(username: string, password: string): Promise<SessionUser> {
  const { user } = await request<{ user: SessionUser }>('/api/session', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  return user;
}

export async function signOut(): Promise<void> {
  await request('/api/session', { method: 'DELETE' });
}

/** Null rather than throwing, so a signed-out visitor is not an error. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const { user } = await request<{ user: SessionUser }>('/api/session');
    return user;
  } catch {
    return null;
  }
}
