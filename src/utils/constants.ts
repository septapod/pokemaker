/**
 * Constants used throughout the PokéMaker app.
 * These include dropdown options, default values, and configuration.
 */

import type { PokemonType, EggGroup, GrowthRate, EvolutionStage } from '../types/pokemon.types';

// All 18 Pokémon types for dropdown selections
export const POKEMON_TYPES: PokemonType[] = [
  'Normal', 'Fire', 'Water', 'Electric',
  'Grass', 'Ice', 'Fighting', 'Poison',
  'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Dark',
  'Steel', 'Fairy'
];

// Evolution stages
export const EVOLUTION_STAGES: EvolutionStage[] = [
  'Basic',
  'Stage 1',
  'Stage 2'
];

// Growth/Experience rates
export const GROWTH_RATES: GrowthRate[] = [
  'Erratic',
  'Fast',
  'Medium Fast',
  'Medium Slow',
  'Slow',
  'Fluctuating'
];

// Egg groups for breeding mechanics
export const EGG_GROUPS: EggGroup[] = [
  'Monster',
  'Water 1',
  'Water 2',
  'Water 3',
  'Bug',
  'Flying',
  'Field',
  'Fairy',
  'Grass',
  'Human-Like',
  'Mineral',
  'Amorphous',
  'Ditto',
  'Dragon',
  'Undiscovered'
];

// Common Pokémon body shapes
export const BODY_SHAPES = [
  'Bipedal with tail',
  'Bipedal without tail',
  'Quadruped',
  'Serpentine',
  'Multiple bodies',
  'With wings',
  'Tentacles or fins',
  'Head and base',
  'Head and arms',
  'Head only',
  'Insectoid',
  'Multiple legs'
];

// Color options for Pokémon
export const POKEMON_COLORS = [
  'Red',
  'Blue',
  'Yellow',
  'Green',
  'Black',
  'Brown',
  'Purple',
  'Gray',
  'White',
  'Pink'
];

// Default stat values (for a balanced starter Pokémon)
export const DEFAULT_STATS = {
  hp: 45,
  attack: 49,
  defense: 49,
  specialAttack: 65,
  specialDefense: 65,
  speed: 45
};

// Min and max values for stats
export const STAT_MIN = 1;
export const STAT_MAX = 255;

// Default catch rate and friendship
export const DEFAULT_CATCH_RATE = 45;
export const DEFAULT_BASE_FRIENDSHIP = 70;
export const DEFAULT_EGG_CYCLES = 20;

// Image generation prompt template for OpenAI
export const AI_IMAGE_PROMPT_TEMPLATE = `Create a cute, family-friendly fantasy creature character illustration for a children's game.

This is for a kid-friendly monster creation app. The character should be:
- Appropriate for all ages
- Cute and friendly-looking
- Colorful and cheerful
- Anime/manga art style with bold outlines
- Clean, polished design
- Vibrant, saturated colors
- White or simple background
- Front-facing or 3/4 view
- Japanese monster-collecting game aesthetic

Make it professional, polished, and completely safe for children.`;

// Type colors for visual display (matches official Pokémon type colors)
export const TYPE_COLORS: Record<PokemonType, string> = {
  'Normal': '#A8A878',
  'Fire': '#F08030',
  'Water': '#6890F0',
  'Electric': '#F8D030',
  'Grass': '#78C850',
  'Ice': '#98D8D8',
  'Fighting': '#C03028',
  'Poison': '#A040A0',
  'Ground': '#E0C068',
  'Flying': '#A890F0',
  'Psychic': '#F85888',
  'Bug': '#A8B820',
  'Rock': '#B8A038',
  'Ghost': '#705898',
  'Dragon': '#7038F8',
  'Dark': '#705848',
  'Steel': '#B8B8D0',
  'Fairy': '#EE99AC'
};

// Type icons for visual display (Remix Icons)
export const TYPE_ICONS: Record<PokemonType, string> = {
  'Normal': 'ri-circle-line',
  'Fire': 'ri-fire-line',
  'Water': 'ri-drop-line',
  'Electric': 'ri-flashlight-line',
  'Grass': 'ri-leaf-line',
  'Ice': 'ri-snowy-line',
  'Fighting': 'ri-boxing-line',
  'Poison': 'ri-flask-line',
  'Ground': 'ri-earth-line',
  'Flying': 'ri-plane-line',
  'Psychic': 'ri-brain-line',
  'Bug': 'ri-bug-line',
  'Rock': 'ri-stone-line',
  'Ghost': 'ri-ghost-line',
  'Dragon': 'ri-dragon-line',
  'Dark': 'ri-moon-line',
  'Steel': 'ri-hammer-line',
  'Fairy': 'ri-star-smile-line'
};
