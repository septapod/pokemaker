/**
 * Edit Pokemon Page
 *
 * This page allows editing an existing Pokémon.
 * It reuses the same form as CreatePokemon but pre-fills it with existing data.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPokemonById, getAllPokemon } from '../services/supabase';
import type { Pokemon } from '../types/pokemon.types';
import CreatePokemon from './CreatePokemon';

function EditPokemon() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [allPokemon, setAllPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllPokemon();
  }, []);

  useEffect(() => {
    if (id) {
      loadPokemon(id);
    }
  }, [id]);

  async function loadAllPokemon() {
    try {
      const data = await getAllPokemon();
      setAllPokemon(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Error loading Pokémon list:', err);
    }
  }

  async function loadPokemon(pokemonId: string) {
    try {
      const data = await getPokemonById(pokemonId);
      setPokemon(data);
    } catch (err) {
      console.error('Error loading Pokémon:', err);
      navigate('/gallery');
    } finally {
      setLoading(false);
    }
  }

  function handlePokemonChange(newId: string) {
    if (newId !== id) {
      navigate(`/edit/${newId}`);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <i className="ri-loader-4-line animate-spin text-6xl block mb-4 text-blue-500"></i>
        <p className="text-2xl font-bold text-gray-700">Loading...</p>
      </div>
    );
  }

  if (!pokemon) {
    return null;
  }

  // Reuse CreatePokemon component with edit mode
  return (
    <div>
      {/* Pokemon Selector Dropdown */}
      {allPokemon.length > 1 && (
        <div className="mb-6 bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl p-4 shadow-lg">
          <label className="block text-lg font-bold text-gray-800 mb-2">
            <i className="ri-arrow-left-right-line mr-2"></i>
            Quick Switch to Another Pokémon:
          </label>
          <select
            value={id}
            onChange={(e) => handlePokemonChange(e.target.value)}
            className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500 text-lg font-semibold bg-white"
          >
            {allPokemon.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.pokedexNumber ? `(#${p.pokedexNumber.toString().padStart(3, '0')})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <CreatePokemon editMode={true} existingPokemon={pokemon} />
    </div>
  );
}

export default EditPokemon;
