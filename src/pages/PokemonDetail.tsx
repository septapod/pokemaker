/**
 * Pokemon Detail Page
 *
 * This page shows all the details of a single Pokémon.
 * Users can view stats, abilities, evolution info, and edit or delete the Pokémon.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPokemonById, deletePokemon, getPokemonByName } from '../services/supabase';
import type { Pokemon } from '../types/pokemon.types';
import { TYPE_COLORS, TYPE_ICONS } from '../utils/constants';
import { useAuth } from '../contexts/AuthContext';

function PokemonDetail() {
  // Get the Pokémon ID from the URL (e.g., /pokemon/123)
  const { id } = useParams<{ id: string }>();
  // useNavigate allows us to redirect to other pages
  const navigate = useNavigate();
  // Get current user to check ownership
  const { user } = useAuth();

  // State to store the Pokémon data
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // State for evolution Pokémon IDs
  const [evolvesFromId, setEvolvesFromId] = useState<string | null>(null);
  const [evolvesIntoId, setEvolvesIntoId] = useState<string | null>(null);

  // Load the Pokémon data when the page loads
  useEffect(() => {
    if (id) {
      loadPokemon(id);
    }
  }, [id]);

  // Load evolution Pokémon data when the main Pokémon data is loaded
  useEffect(() => {
    if (pokemon) {
      loadEvolutionPokemon();
    }
  }, [pokemon]);

  // Fetch Pokémon data from the database
  async function loadPokemon(pokemonId: string) {
    try {
      setLoading(true);
      const data = await getPokemonById(pokemonId);
      setPokemon(data);
      setError(null);
    } catch (err) {
      console.error('Error loading Pokémon:', err);
      setError('Failed to load Pokémon details.');
    } finally {
      setLoading(false);
    }
  }

  // Fetch evolution Pokémon by name
  async function loadEvolutionPokemon() {
    try {
      // Look up the Pokémon that this one evolves from
      if (pokemon?.evolvesFrom) {
        const fromPokemon = await getPokemonByName(pokemon.evolvesFrom);
        if (fromPokemon?.id) {
          setEvolvesFromId(fromPokemon.id);
        }
      }

      // Look up the Pokémon that this one evolves into
      if (pokemon?.evolvesInto) {
        const intoPokemon = await getPokemonByName(pokemon.evolvesInto);
        if (intoPokemon?.id) {
          setEvolvesIntoId(intoPokemon.id);
        }
      }
    } catch (err) {
      console.error('Error loading evolution Pokémon:', err);
    }
  }

  // Delete the Pokémon
  async function handleDelete() {
    if (!id) return;

    try {
      await deletePokemon(id);
      // Redirect to gallery after successful deletion
      navigate('/gallery');
    } catch (err) {
      console.error('Error deleting Pokémon:', err);
      alert('Failed to delete Pokémon. Please try again.');
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-12">
        <i className="ri-loader-4-line animate-spin text-6xl block mb-4 text-blue-500"></i>
        <p className="text-2xl font-bold text-gray-700">Loading Pokémon...</p>
      </div>
    );
  }

  // Error state
  if (error || !pokemon) {
    return (
      <div className="text-center py-12">
        <i className="ri-emotion-sad-line text-6xl block mb-4 text-red-500"></i>
        <p className="text-2xl font-bold text-red-600 mb-4">{error || 'Pokémon not found'}</p>
        <Link to="/gallery" className="btn-pokemon inline-block">
          Back to Gallery
        </Link>
      </div>
    );
  }

  // Calculate total base stats (handle optional stats with ?? 0)
  const totalStats = (pokemon.hp ?? 0) + (pokemon.attack ?? 0) + (pokemon.defense ?? 0) +
                     (pokemon.specialAttack ?? 0) + (pokemon.specialDefense ?? 0) + (pokemon.speed ?? 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <Link
        to="/gallery"
        className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 font-bold"
      >
        ← Back to Gallery
      </Link>

      {/* Pokémon Card */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header with Images */}
        <div className="bg-gradient-to-br from-blue-400 to-purple-500 p-8">
          {/* Images Section - Show both original and AI-generated */}
          {pokemon.originalDrawingUrl && (
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white text-center mb-4">
                ✨ From Drawing to Pokémon ✨
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Original Drawing */}
                <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                  <div className="bg-yellow-400 px-4 py-2 text-center">
                    <span className="font-bold text-gray-800">🎨 Original Drawing</span>
                  </div>
                  <div className="aspect-square">
                    <img
                      src={pokemon.originalDrawingUrl}
                      alt={`${pokemon.name} - Original Drawing`}
                      className="w-full h-full object-contain bg-white p-4"
                    />
                  </div>
                </div>

                {/* Your Creation */}
                <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                  <div className="bg-green-400 px-4 py-2 text-center">
                    <span className="font-bold text-gray-800">✨ Your Creation</span>
                  </div>
                  <div className="aspect-square">
                    {pokemon.aiGeneratedImageUrl ? (
                      <img
                        src={pokemon.aiGeneratedImageUrl}
                        alt={`${pokemon.name} - Your Creation`}
                        className="w-full h-full object-contain bg-white p-4"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <i className="ri-image-line text-6xl text-gray-300"></i>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* If no original drawing, just show AI image (or placeholder if neither exists) */}
          {!pokemon.originalDrawingUrl && (
            <div className="flex flex-col md:flex-row items-center gap-8 mb-6">
              {/* Pokémon Image */}
              <div className="w-64 h-64 bg-white rounded-xl shadow-xl overflow-hidden flex-shrink-0">
                {pokemon.aiGeneratedImageUrl ? (
                  <img
                    src={pokemon.aiGeneratedImageUrl}
                    alt={pokemon.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <i className="ri-image-line text-6xl text-gray-300"></i>
                  </div>
                )}
              </div>
              <div className="flex-grow"></div>
            </div>
          )}

          {/* Basic Info */}
          <div className="text-white text-center md:text-left">
            {pokemon.pokedexNumber && (
              <p className="text-2xl font-bold opacity-90 mb-2">
                #{pokemon.pokedexNumber.toString().padStart(3, '0')}
              </p>
            )}
            <h1 className="text-5xl font-bold mb-4">{pokemon.name}</h1>

            {/* Types */}
            <div className="flex gap-3 mb-4 justify-center md:justify-start">
              <span
                className="px-4 py-2 rounded-full text-white font-bold text-lg shadow-lg flex items-center gap-2"
                style={{ backgroundColor: TYPE_COLORS[pokemon.typePrimary] }}
              >
                <i className={`${TYPE_ICONS[pokemon.typePrimary]} text-xl`}></i>
                {pokemon.typePrimary}
              </span>
              {pokemon.typeSecondary && (
                <span
                  className="px-4 py-2 rounded-full text-white font-bold text-lg shadow-lg flex items-center gap-2"
                  style={{ backgroundColor: TYPE_COLORS[pokemon.typeSecondary] }}
                >
                  <i className={`${TYPE_ICONS[pokemon.typeSecondary]} text-xl`}></i>
                  {pokemon.typeSecondary}
                </span>
              )}
            </div>

            {/* Category */}
            {pokemon.category && (
              <p className="text-xl opacity-90">{pokemon.category}</p>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="p-8">
          {/* Pokédex Entry */}
          {pokemon.pokedexEntry && (
            <div className="mb-8 bg-blue-50 p-6 rounded-xl">
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Pokédex Entry</h2>
              <p className="text-lg text-gray-700 leading-relaxed">{pokemon.pokedexEntry}</p>
            </div>
          )}

          {/* Physical Characteristics */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {pokemon.heightValue && (
              <div>
                <h3 className="font-bold text-gray-600 mb-1">Height</h3>
                <p className="text-2xl font-bold text-gray-800">
                  {pokemon.heightValue} {pokemon.heightUnit}
                </p>
              </div>
            )}
            {pokemon.weightValue && (
              <div>
                <h3 className="font-bold text-gray-600 mb-1">Weight</h3>
                <p className="text-2xl font-bold text-gray-800">
                  {pokemon.weightValue} {pokemon.weightUnit}
                </p>
              </div>
            )}
          </div>

          {/* Base Stats */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Base Stats</h2>
            <div className="space-y-3">
              <StatBar label="HP" value={pokemon.hp} color="bg-red-500" />
              <StatBar label="Attack" value={pokemon.attack} color="bg-orange-500" />
              <StatBar label="Defense" value={pokemon.defense} color="bg-yellow-500" />
              <StatBar label="Sp. Attack" value={pokemon.specialAttack} color="bg-blue-500" />
              <StatBar label="Sp. Defense" value={pokemon.specialDefense} color="bg-green-500" />
              <StatBar label="Speed" value={pokemon.speed} color="bg-pink-500" />
            </div>
            <div className="mt-4 text-right">
              <span className="text-lg font-bold text-gray-600">
                Total: <span className="text-2xl text-gray-800">{totalStats}</span>
              </span>
            </div>
          </div>

          {/* Abilities */}
          {(pokemon.ability1 || pokemon.ability2 || pokemon.hiddenAbility) && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Abilities</h2>
              <div className="space-y-3">
                {pokemon.ability1 && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-bold text-lg text-purple-800">{pokemon.ability1.name}</h3>
                    <p className="text-gray-700">{pokemon.ability1.description}</p>
                  </div>
                )}
                {pokemon.ability2 && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-bold text-lg text-purple-800">{pokemon.ability2.name}</h3>
                    <p className="text-gray-700">{pokemon.ability2.description}</p>
                  </div>
                )}
                {pokemon.hiddenAbility && (
                  <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-400">
                    <h3 className="font-bold text-lg text-yellow-800">
                      {pokemon.hiddenAbility.name} <span className="text-sm">(Hidden)</span>
                    </h3>
                    <p className="text-gray-700">{pokemon.hiddenAbility.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Evolution Info */}
          {(pokemon.evolutionStage || pokemon.evolvesFrom || pokemon.evolvesInto || pokemon.evolutionMethod) && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Evolution</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {pokemon.evolutionStage && (
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-600">Evolution Stage</h3>
                    <p className="text-lg font-bold text-gray-800">{pokemon.evolutionStage}</p>
                  </div>
                )}
                {pokemon.evolvesFrom && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-600">Evolves From</h3>
                    {evolvesFromId ? (
                      <Link
                        to={`/pokemon/${evolvesFromId}`}
                        className="text-lg font-bold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {pokemon.evolvesFrom} →
                      </Link>
                    ) : (
                      <p className="text-lg font-bold text-gray-800">{pokemon.evolvesFrom}</p>
                    )}
                  </div>
                )}
                {pokemon.evolvesInto && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-600">Evolves Into</h3>
                    {evolvesIntoId ? (
                      <Link
                        to={`/pokemon/${evolvesIntoId}`}
                        className="text-lg font-bold text-green-600 hover:text-green-800 hover:underline"
                      >
                        → {pokemon.evolvesInto}
                      </Link>
                    ) : (
                      <p className="text-lg font-bold text-gray-800">{pokemon.evolvesInto}</p>
                    )}
                  </div>
                )}
                {pokemon.evolutionMethod && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-600">Evolution Method</h3>
                    <p className="text-lg font-bold text-gray-800">{pokemon.evolutionMethod}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Breeding Info */}
          {(pokemon.eggGroup1 || pokemon.eggGroup2 || pokemon.isGenderless !== undefined || pokemon.genderRatioMale !== undefined || pokemon.eggCycles !== undefined) && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Breeding</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {pokemon.eggGroup1 && (
                  <div className="bg-pink-50 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-600">Egg Group 1</h3>
                    <p className="text-lg font-bold text-gray-800">{pokemon.eggGroup1}</p>
                  </div>
                )}
                {pokemon.eggGroup2 && (
                  <div className="bg-pink-50 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-600">Egg Group 2</h3>
                    <p className="text-lg font-bold text-gray-800">{pokemon.eggGroup2}</p>
                  </div>
                )}
                {pokemon.isGenderless ? (
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-600">Gender</h3>
                    <p className="text-lg font-bold text-gray-800">Genderless</p>
                  </div>
                ) : pokemon.genderRatioMale !== undefined && pokemon.genderRatioMale !== null ? (
                  <>
                    <div className="bg-violet-100 p-4 rounded-lg">
                      <h3 className="font-bold text-gray-600">Male %</h3>
                      <p className="text-lg font-bold text-gray-800">{pokemon.genderRatioMale}%</p>
                    </div>
                    <div className="bg-cyan-100 p-4 rounded-lg">
                      <h3 className="font-bold text-gray-600">Female %</h3>
                      <p className="text-lg font-bold text-gray-800">{100 - pokemon.genderRatioMale}%</p>
                    </div>
                  </>
                ) : null}
                {pokemon.eggCycles && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-600">Egg Cycles</h3>
                    <p className="text-lg font-bold text-gray-800">{pokemon.eggCycles}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Game Mechanics */}
          {(pokemon.catchRate !== undefined || pokemon.baseFriendship !== undefined || pokemon.growthRate || pokemon.color || pokemon.shape) && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Game Mechanics</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {pokemon.catchRate !== undefined && pokemon.catchRate !== null && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-600">Catch Rate</h3>
                    <p className="text-lg font-bold text-gray-800">{pokemon.catchRate} / 255</p>
                  </div>
                )}
                {pokemon.baseFriendship !== undefined && pokemon.baseFriendship !== null && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-600">Base Friendship</h3>
                    <p className="text-lg font-bold text-gray-800">{pokemon.baseFriendship} / 255</p>
                  </div>
                )}
                {pokemon.growthRate && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-600">Growth Rate</h3>
                    <p className="text-lg font-bold text-gray-800">{pokemon.growthRate}</p>
                  </div>
                )}
                {pokemon.color && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-600">Color</h3>
                    <p className="text-lg font-bold text-gray-800">{pokemon.color}</p>
                  </div>
                )}
                {pokemon.shape && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-600">Shape</h3>
                    <p className="text-lg font-bold text-gray-800">{pokemon.shape}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Moves */}
          {(pokemon.levelUpMoves?.length || pokemon.tmMoves?.length || pokemon.eggMoves?.length) && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Moves</h2>
              <div className="space-y-4">
                {pokemon.levelUpMoves && pokemon.levelUpMoves.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-700 mb-2">Level Up Moves</h3>
                    <div className="flex flex-wrap gap-2">
                      {pokemon.levelUpMoves.map((move, idx) => (
                        <div key={idx} className="bg-blue-100 px-3 py-1 rounded-full text-sm">
                          <span className="font-semibold text-blue-900">{move.name}</span> <span className="text-xs text-blue-700">Lv.{move.level}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {pokemon.tmMoves && pokemon.tmMoves.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-700 mb-2">TM Moves</h3>
                    <div className="flex flex-wrap gap-2">
                      {pokemon.tmMoves.map((move, idx) => (
                        <span key={idx} className="bg-yellow-100 px-3 py-1 rounded-full text-sm text-yellow-900">
                          {move}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {pokemon.eggMoves && pokemon.eggMoves.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-700 mb-2">Egg Moves</h3>
                    <div className="flex flex-wrap gap-2">
                      {pokemon.eggMoves.map((move, idx) => (
                        <span key={idx} className="bg-pink-100 px-3 py-1 rounded-full text-sm text-pink-900">
                          {move}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons - Only show to the pokemon's creator */}
          {user && pokemon.userId === user.id && (
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <Link
                to={`/pokemon/${id}/edit`}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-center transition-colors flex items-center justify-center gap-2"
              >
                <i className="ri-edit-line"></i> Edit Pokémon
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <i className="ri-delete-bin-line"></i> Delete Pokémon
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              Delete {pokemon.name}?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this Pokémon? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for stat bars
function StatBar({ label, value, color }: { label: string; value: number | undefined; color: string }) {
  const actualValue = value ?? 0;
  const percentage = (actualValue / 255) * 100;

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="font-bold text-gray-700">{label}</span>
        <span className="font-bold text-gray-800">{actualValue}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default PokemonDetail;
