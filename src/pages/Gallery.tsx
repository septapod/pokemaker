/**
 * Gallery Page
 *
 * This page displays all the Pokémon that have been created.
 * Shows them in a grid of cards that can be filtered and sorted.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllPokemon } from '../services/supabase';
import type { Pokemon } from '../types/pokemon.types';
import { TYPE_COLORS } from '../utils/constants';

function Gallery() {
  // State to store the list of Pokémon
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  // State for loading status
  const [loading, setLoading] = useState(true);
  // State for any errors
  const [error, setError] = useState<string | null>(null);

  // Load Pokémon when the page first loads
  useEffect(() => {
    loadPokemon();
  }, []);

  // Function to fetch Pokémon from the database
  async function loadPokemon() {
    try {
      setLoading(true);
      const data = await getAllPokemon();
      setPokemon(data);
      setError(null);
    } catch (err) {
      console.error('Error loading Pokémon:', err);
      setError('Failed to load Pokémon. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Show loading message while fetching data
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚡</div>
        <p className="text-2xl font-bold text-gray-700">Loading your Pokémon...</p>
      </div>
    );
  }

  // Show error message if something went wrong
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">😢</div>
        <p className="text-2xl font-bold text-red-600 mb-4">{error}</p>
        <button
          onClick={loadPokemon}
          className="btn-pokemon"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Show message if no Pokémon have been created yet
  if (pokemon.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📝</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          No Pokémon Yet!
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          You haven't created any Pokémon yet. Let's make your first one!
        </p>
        <Link to="/create" className="btn-pokemon inline-block">
          Create Your First Pokémon
        </Link>
      </div>
    );
  }

  // Display the gallery of Pokémon cards
  return (
    <div>
      {/* Page Header */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-gray-800 mb-2">
          My Pokémon Collection 📚
        </h2>
        <p className="text-xl text-gray-600">
          You've created {pokemon.length} amazing Pokémon!
        </p>
      </div>

      {/* Pokémon Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {pokemon.map((p) => (
          <Link
            key={p.id}
            to={`/pokemon/${p.id}`}
            className="pokemon-card group cursor-pointer"
          >
            {/* Pokémon Image */}
            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
              {(p.aiGeneratedImageUrl || p.originalDrawingUrl) ? (
                <img
                  src={p.aiGeneratedImageUrl || p.originalDrawingUrl}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-6xl">
                  🎨
                </div>
              )}
              {/* Pokédex Number Badge */}
              {p.pokedexNumber && (
                <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-bold">
                  #{p.pokedexNumber.toString().padStart(3, '0')}
                </div>
              )}
            </div>

            {/* Pokémon Info */}
            <div className="p-4">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                {p.name}
              </h3>

              {/* Type Badges */}
              <div className="flex gap-2 flex-wrap">
                <span
                  className="px-3 py-1 rounded-full text-white text-sm font-bold"
                  style={{ backgroundColor: TYPE_COLORS[p.typePrimary] }}
                >
                  {p.typePrimary}
                </span>
                {p.typeSecondary && (
                  <span
                    className="px-3 py-1 rounded-full text-white text-sm font-bold"
                    style={{ backgroundColor: TYPE_COLORS[p.typeSecondary] }}
                  >
                    {p.typeSecondary}
                  </span>
                )}
              </div>

              {/* Stats Preview */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>HP: {p.hp ?? '-'}</span>
                  <span>ATK: {p.attack ?? '-'}</span>
                  <span>DEF: {p.defense ?? '-'}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Gallery;
