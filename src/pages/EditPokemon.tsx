/**
 * Edit Pokemon Page
 *
 * This page allows editing an existing Pokémon.
 * It reuses the same form as CreatePokemon but pre-fills it with existing data.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPokemonById } from '../services/supabase';
import type { Pokemon } from '../types/pokemon.types';
import CreatePokemon from './CreatePokemon';

function EditPokemon() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPokemon(id);
    }
  }, [id]);

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
  return <CreatePokemon editMode={true} existingPokemon={pokemon} />;
}

export default EditPokemon;
