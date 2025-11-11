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
import { TYPE_COLORS, TYPE_ICONS } from '../utils/constants';

type SortOption = 'alphabetical' | 'newest' | 'oldest';

function Gallery() {
  // State to store the list of Pokémon
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  // State for loading status
  const [loading, setLoading] = useState(true);
  // State for any errors
  const [error, setError] = useState<string | null>(null);
  // State for search query
  const [searchQuery, setSearchQuery] = useState('');
  // State for sort option
  const [sortBy, setSortBy] = useState<SortOption>('newest');

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
        <i className="ri-loader-4-line animate-spin text-6xl block mb-4 text-blue-500"></i>
        <p className="text-2xl font-bold text-gray-700">Loading your Pokémon...</p>
      </div>
    );
  }

  // Show error message if something went wrong
  if (error) {
    return (
      <div className="text-center py-12">
        <i className="ri-emotion-sad-line text-6xl block mb-4 text-red-500"></i>
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
        <i className="ri-file-add-line text-6xl block mb-4 text-purple-500"></i>
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

  // Filter and sort Pokémon based on search query and sort option
  const getFilteredAndSortedPokemon = () => {
    let result = pokemon.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort based on sort option
    if (sortBy === 'alphabetical') {
      return [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'newest') {
      return [...result].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Newest first
      });
    } else if (sortBy === 'oldest') {
      return [...result].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateA - dateB; // Oldest first
      });
    }

    return result;
  };

  const filteredAndSortedPokemon = getFilteredAndSortedPokemon();

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

      {/* Search and Sort Controls */}
      <div className="mb-8 space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <div className="w-full sm:w-96">
            <input
              type="text"
              placeholder="Search Pokémon by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-lg"
            />
          </div>
        </div>

        {/* Sort Options */}
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => setSortBy('alphabetical')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              sortBy === 'alphabetical'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            A-Z
          </button>
          <button
            onClick={() => setSortBy('newest')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              sortBy === 'newest'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Newest First
          </button>
          <button
            onClick={() => setSortBy('oldest')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              sortBy === 'oldest'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Oldest First
          </button>
        </div>

        {/* Results count */}
        {searchQuery && (
          <div className="text-center text-gray-600">
            Found {filteredAndSortedPokemon.length} of {pokemon.length} Pokémon
          </div>
        )}
      </div>

      {/* Show message if no results found */}
      {filteredAndSortedPokemon.length === 0 && (
        <div className="text-center py-12">
          <i className="ri-search-line text-6xl block mb-4 text-gray-400"></i>
          <p className="text-xl text-gray-600">
            No Pokémon found matching "{searchQuery}"
          </p>
        </div>
      )}

      {/* Pokémon Grid */}
      {filteredAndSortedPokemon.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedPokemon.map((p) => (
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
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <i className="ri-image-line text-6xl"></i>
                </div>
              )}
              {/* Type Badge */}
              {p.typePrimary && (
                <div
                  className="absolute bottom-2 left-2 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg"
                  style={{ backgroundColor: TYPE_COLORS[p.typePrimary] }}
                >
                  <i className={`${TYPE_ICONS[p.typePrimary]} text-base`}></i>
                  {p.typePrimary}
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
                  className="px-3 py-1 rounded-full text-white text-sm font-bold flex items-center gap-1"
                  style={{ backgroundColor: TYPE_COLORS[p.typePrimary] }}
                >
                  <i className={`${TYPE_ICONS[p.typePrimary]}`}></i>
                  {p.typePrimary}
                </span>
                {p.typeSecondary && (
                  <span
                    className="px-3 py-1 rounded-full text-white text-sm font-bold flex items-center gap-1"
                    style={{ backgroundColor: TYPE_COLORS[p.typeSecondary] }}
                  >
                    <i className={`${TYPE_ICONS[p.typeSecondary]}`}></i>
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
      )}
    </div>
  );
}

export default Gallery;
