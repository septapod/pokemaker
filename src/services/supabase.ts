/**
 * Supabase Service
 *
 * This file sets up the connection to Supabase, which is our database and storage service.
 * Supabase provides:
 * - PostgreSQL database (to store Pokémon data)
 * - Storage (to store images)
 * - Authentication (for future multi-user support)
 */

import { createClient } from '@supabase/supabase-js';
import type { Pokemon } from '../types/pokemon.types';

// Get environment variables
// VITE_ prefix makes these available in the browser
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

// Create and export the Supabase client
// This client is used throughout the app to interact with the database
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

/**
 * POKEMON DATABASE OPERATIONS
 */

/**
 * Create a new Pokémon in the database
 * @param pokemon - The Pokémon data to save
 * @returns The created Pokémon with its ID
 */
export async function createPokemon(pokemon: Omit<Pokemon, 'id' | 'createdAt' | 'updatedAt'>) {
  const { data, error } = await supabase
    .from('pokemon')
    .insert([{
      // User ownership (optional - for multi-user support)
      user_id: pokemon.userId || null,

      // Basic Identity
      name: pokemon.name,
      pokedex_number: pokemon.pokedexNumber,
      category: pokemon.category,
      type_primary: pokemon.typePrimary,
      type_secondary: pokemon.typeSecondary,
      color: pokemon.color,

      // Physical
      height_value: pokemon.heightValue,
      height_unit: pokemon.heightUnit,
      weight_value: pokemon.weightValue,
      weight_unit: pokemon.weightUnit,
      shape: pokemon.shape,
      pokedex_entry: pokemon.pokedexEntry,

      // Stats
      hp: pokemon.hp,
      attack: pokemon.attack,
      defense: pokemon.defense,
      special_attack: pokemon.specialAttack,
      special_defense: pokemon.specialDefense,
      speed: pokemon.speed,

      // Abilities
      ability_1_name: pokemon.ability1?.name,
      ability_1_description: pokemon.ability1?.description,
      ability_2_name: pokemon.ability2?.name,
      ability_2_description: pokemon.ability2?.description,
      hidden_ability_name: pokemon.hiddenAbility?.name,
      hidden_ability_description: pokemon.hiddenAbility?.description,

      // Evolution
      evolution_stage: pokemon.evolutionStage,
      evolves_from: pokemon.evolvesFrom,
      evolves_into: pokemon.evolvesInto,
      evolution_method: pokemon.evolutionMethod,
      egg_group_1: pokemon.eggGroup1,
      egg_group_2: pokemon.eggGroup2,
      gender_ratio_male: pokemon.genderRatioMale,
      gender_ratio_female: pokemon.genderRatioFemale,
      is_genderless: pokemon.isGenderless,
      egg_cycles: pokemon.eggCycles,

      // Game Mechanics
      catch_rate: pokemon.catchRate,
      base_friendship: pokemon.baseFriendship,
      growth_rate: pokemon.growthRate,
      ev_yield: pokemon.evYield,

      // Images
      original_drawing_url: pokemon.originalDrawingUrl,
      ai_generated_image_url: pokemon.aiGeneratedImageUrl,
      physical_appearance: pokemon.physicalAppearance,
      image_description: pokemon.imageDescription,

      // Moves
      level_up_moves: pokemon.levelUpMoves,
      tm_moves: pokemon.tmMoves,
      egg_moves: pokemon.eggMoves,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating Pokémon:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      fullError: error
    });

    // Provide more specific error message
    let errorMessage = 'Failed to save Pokémon. ';
    if (error.code === '23502') {
      errorMessage += 'Missing required field: ' + (error.message || 'Please check all required fields.');
    } else if (error.code === '23505') {
      errorMessage += 'This Pokémon already exists.';
    } else if (error.message) {
      errorMessage += error.message;
    } else {
      errorMessage += 'Please try again.';
    }

    throw new Error(errorMessage);
  }

  return convertDatabaseToPokemon(data);
}

/**
 * Get all Pokémon from the database (with creator username)
 * @returns Array of all Pokémon
 */
export async function getAllPokemon(): Promise<Pokemon[]> {
  const { data, error } = await supabase
    .from('pokemon')
    .select('*, users(username)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching Pokémon:', error);
    throw error;
  }

  return data.map(convertDatabaseToPokemon);
}

/**
 * Get only the current user's Pokémon from the database
 * @param userId - The ID of the user whose Pokémon to fetch
 * @returns Array of Pokémon owned by the specified user
 */
export async function getMyPokemon(userId: string): Promise<Pokemon[]> {
  const { data, error } = await supabase
    .from('pokemon')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user Pokémon:', error);
    throw error;
  }

  return data.map(convertDatabaseToPokemon);
}

/**
 * Get a single Pokémon by ID
 * @param id - The Pokémon's ID
 * @returns The Pokémon data
 */
export async function getPokemonById(id: string): Promise<Pokemon> {
  const { data, error } = await supabase
    .from('pokemon')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching Pokémon:', error);
    throw error;
  }

  return convertDatabaseToPokemon(data);
}

/**
 * Find a Pokémon by name (case-insensitive)
 * @param name - The Pokémon's name
 * @returns The Pokémon data or null if not found
 */
export async function getPokemonByName(name: string): Promise<Pokemon | null> {
  try {
    const { data, error } = await supabase
      .from('pokemon')
      .select('*')
      .ilike('name', name)
      .single();

    if (error) {
      // Not found is not an error
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching Pokémon by name:', error);
      throw error;
    }

    return convertDatabaseToPokemon(data);
  } catch (error) {
    console.error('Error in getPokemonByName:', error);
    return null;
  }
}

/**
 * Find or create a Pokémon by name
 * If the Pokémon doesn't exist, creates a new one with just the name
 * @param name - The Pokémon's name
 * @returns The Pokémon data (existing or newly created)
 */
export async function findOrCreatePokemonByName(name: string, userId?: string): Promise<Pokemon | null> {
  if (!name || name.trim() === '') {
    console.log('findOrCreatePokemonByName: Name is empty, returning null');
    return null;
  }

  try {
    // First try to find existing Pokemon
    let pokemon = await getPokemonByName(name);

    // If not found, create a new one with just the name
    if (!pokemon) {
      console.log(`Creating new Pokémon: ${name} with userId: ${userId || 'undefined (NO USER LOGGED IN!)'}`);
      pokemon = await createPokemon({
        name: name.trim(),
        typePrimary: 'Normal', // Default type for new evolution Pokemon
        userId: userId, // Assign to current user if provided
      });
      console.log(`✅ Successfully created evolution Pokémon: ${name}`, pokemon);
    } else {
      console.log(`✅ Found existing Pokémon: ${name}`);
    }

    return pokemon;
  } catch (error: any) {
    console.error('❌ ERROR in findOrCreatePokemonByName:', {
      name,
      userId,
      errorMessage: error?.message,
      errorCode: error?.code,
      fullError: error,
    });
    return null;
  }
}

/**
 * Update an existing Pokémon
 * @param id - The Pokémon's ID
 * @param pokemon - The updated Pokémon data
 * @param userId - The ID of the user attempting the update (optional for backward compatibility)
 * @returns The updated Pokémon
 */
export async function updatePokemon(id: string, pokemon: Partial<Pokemon>, userId?: string) {
  // Verify ownership if userId is provided
  if (userId) {
    const existingPokemon = await getPokemonById(id);
    if (existingPokemon.userId && existingPokemon.userId !== userId) {
      throw new Error('You do not have permission to edit this Pokémon.');
    }
  }

  const { data, error } = await supabase
    .from('pokemon')
    .update({
      // Only update provided fields
      // Basic Identity
      ...(pokemon.name && { name: pokemon.name }),
      ...(pokemon.pokedexNumber !== undefined && { pokedex_number: pokemon.pokedexNumber }),
      ...(pokemon.category && { category: pokemon.category }),
      ...(pokemon.typePrimary && { type_primary: pokemon.typePrimary }),
      ...(pokemon.typeSecondary !== undefined && { type_secondary: pokemon.typeSecondary }),
      ...(pokemon.color && { color: pokemon.color }),

      // Physical Characteristics
      ...(pokemon.heightValue !== undefined && { height_value: pokemon.heightValue }),
      ...(pokemon.heightUnit && { height_unit: pokemon.heightUnit }),
      ...(pokemon.weightValue !== undefined && { weight_value: pokemon.weightValue }),
      ...(pokemon.weightUnit && { weight_unit: pokemon.weightUnit }),
      ...(pokemon.shape && { shape: pokemon.shape }),
      ...(pokemon.pokedexEntry && { pokedex_entry: pokemon.pokedexEntry }),

      // Battle Stats
      ...(pokemon.hp !== undefined && { hp: pokemon.hp }),
      ...(pokemon.attack !== undefined && { attack: pokemon.attack }),
      ...(pokemon.defense !== undefined && { defense: pokemon.defense }),
      ...(pokemon.specialAttack !== undefined && { special_attack: pokemon.specialAttack }),
      ...(pokemon.specialDefense !== undefined && { special_defense: pokemon.specialDefense }),
      ...(pokemon.speed !== undefined && { speed: pokemon.speed }),

      // Abilities
      ...(pokemon.ability1?.name && { ability_1_name: pokemon.ability1.name }),
      ...(pokemon.ability1?.description && { ability_1_description: pokemon.ability1.description }),
      ...(pokemon.ability2?.name && { ability_2_name: pokemon.ability2.name }),
      ...(pokemon.ability2?.description && { ability_2_description: pokemon.ability2.description }),
      ...(pokemon.hiddenAbility?.name && { hidden_ability_name: pokemon.hiddenAbility.name }),
      ...(pokemon.hiddenAbility?.description && { hidden_ability_description: pokemon.hiddenAbility.description }),

      // Evolution & Breeding
      ...(pokemon.evolutionStage && { evolution_stage: pokemon.evolutionStage }),
      ...(pokemon.evolvesFrom && { evolves_from: pokemon.evolvesFrom }),
      ...(pokemon.evolvesInto && { evolves_into: pokemon.evolvesInto }),
      ...(pokemon.evolutionMethod && { evolution_method: pokemon.evolutionMethod }),
      ...(pokemon.eggGroup1 && { egg_group_1: pokemon.eggGroup1 }),
      ...(pokemon.eggGroup2 && { egg_group_2: pokemon.eggGroup2 }),
      ...(pokemon.genderRatioMale !== undefined && { gender_ratio_male: pokemon.genderRatioMale }),
      ...(pokemon.genderRatioFemale !== undefined && { gender_ratio_female: pokemon.genderRatioFemale }),
      ...(pokemon.isGenderless !== undefined && { is_genderless: pokemon.isGenderless }),
      ...(pokemon.eggCycles !== undefined && { egg_cycles: pokemon.eggCycles }),

      // Game Mechanics
      ...(pokemon.catchRate !== undefined && { catch_rate: pokemon.catchRate }),
      ...(pokemon.baseFriendship !== undefined && { base_friendship: pokemon.baseFriendship }),
      ...(pokemon.growthRate && { growth_rate: pokemon.growthRate }),
      ...(pokemon.evYield && { ev_yield: pokemon.evYield }),

      // Images
      ...(pokemon.originalDrawingUrl && { original_drawing_url: pokemon.originalDrawingUrl }),
      ...(pokemon.aiGeneratedImageUrl && { ai_generated_image_url: pokemon.aiGeneratedImageUrl }),
      ...(pokemon.physicalAppearance !== undefined && { physical_appearance: pokemon.physicalAppearance }),
      ...(pokemon.imageDescription !== undefined && { image_description: pokemon.imageDescription }),

      // Moves
      ...(pokemon.levelUpMoves && { level_up_moves: pokemon.levelUpMoves }),
      ...(pokemon.tmMoves && { tm_moves: pokemon.tmMoves }),
      ...(pokemon.eggMoves && { egg_moves: pokemon.eggMoves }),

      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating Pokémon:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      fullError: error
    });

    // Provide more specific error message
    let errorMessage = 'Failed to update Pokémon. ';
    if (error.code === '23502') {
      errorMessage += 'Missing required field: ' + (error.message || 'Please check all required fields.');
    } else if (error.message) {
      errorMessage += error.message;
    } else {
      errorMessage += 'Please try again.';
    }

    throw new Error(errorMessage);
  }

  return convertDatabaseToPokemon(data);
}

/**
 * Delete a Pokémon
 * @param id - The Pokémon's ID
 * @param userId - The ID of the user attempting the deletion (optional for backward compatibility)
 */
export async function deletePokemon(id: string, userId?: string) {
  // Verify ownership if userId is provided
  if (userId) {
    const existingPokemon = await getPokemonById(id);
    if (existingPokemon.userId && existingPokemon.userId !== userId) {
      throw new Error('You do not have permission to delete this Pokémon.');
    }
  }

  const { error } = await supabase
    .from('pokemon')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting Pokémon:', error);
    throw error;
  }
}

/**
 * STORAGE OPERATIONS (for images)
 */

/**
 * Upload an image to Supabase Storage
 * @param file - The image file to upload
 * @param bucket - The storage bucket name (default: 'pokemon-images')
 * @returns The public URL of the uploaded image
 */
export async function uploadImage(file: File, bucket: string = 'pokemon-images'): Promise<string> {
  // Generate a unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${fileName}`;

  // Upload the file
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading image:', uploadError);
    throw uploadError;
  }

  // Get the public URL
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * HELPER FUNCTIONS
 */

/**
 * Convert database row to Pokemon type
 * (database uses snake_case, TypeScript uses camelCase)
 */
function convertDatabaseToPokemon(row: any): Pokemon {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    username: row.users?.username, // Extract username from joined users table

    // Basic Identity
    name: row.name,
    pokedexNumber: row.pokedex_number,
    category: row.category,
    typePrimary: row.type_primary,
    typeSecondary: row.type_secondary,
    color: row.color,

    // Physical
    heightValue: row.height_value,
    heightUnit: row.height_unit,
    weightValue: row.weight_value,
    weightUnit: row.weight_unit,
    shape: row.shape,
    pokedexEntry: row.pokedex_entry,

    // Stats
    hp: row.hp,
    attack: row.attack,
    defense: row.defense,
    specialAttack: row.special_attack,
    specialDefense: row.special_defense,
    speed: row.speed,

    // Abilities
    ability1: row.ability_1_name ? {
      name: row.ability_1_name,
      description: row.ability_1_description || ''
    } : undefined,
    ability2: row.ability_2_name ? {
      name: row.ability_2_name,
      description: row.ability_2_description || ''
    } : undefined,
    hiddenAbility: row.hidden_ability_name ? {
      name: row.hidden_ability_name,
      description: row.hidden_ability_description || ''
    } : undefined,

    // Evolution
    evolutionStage: row.evolution_stage,
    evolvesFrom: row.evolves_from,
    evolvesInto: row.evolves_into,
    evolutionMethod: row.evolution_method,
    eggGroup1: row.egg_group_1,
    eggGroup2: row.egg_group_2,
    genderRatioMale: row.gender_ratio_male,
    genderRatioFemale: row.gender_ratio_female,
    isGenderless: row.is_genderless,
    eggCycles: row.egg_cycles,

    // Game Mechanics
    catchRate: row.catch_rate,
    baseFriendship: row.base_friendship,
    growthRate: row.growth_rate,
    evYield: row.ev_yield,

    // Images
    originalDrawingUrl: row.original_drawing_url,
    aiGeneratedImageUrl: row.ai_generated_image_url,
    physicalAppearance: row.physical_appearance,
    imageDescription: row.image_description,

    // Moves
    levelUpMoves: row.level_up_moves,
    tmMoves: row.tm_moves,
    eggMoves: row.egg_moves,
  };
}
