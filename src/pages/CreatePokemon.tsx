/**
 * Create Pokemon Page
 *
 * This is the main form for creating a new Pokémon (or editing an existing one).
 * It's broken into multiple steps to make it less overwhelming:
 * 1. Basic Info (name, types, category)
 * 2. Physical Characteristics (height, weight, description)
 * 3. Battle Stats (HP, Attack, Defense, etc.)
 * 4. Abilities
 * 5. Evolution & Breeding
 * 6. Image Upload & AI Generation
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { Pokemon, PokemonFormData } from '../types/pokemon.types';
import { createPokemon, updatePokemon, uploadImage } from '../services/supabase';
import { generatePokemonImageWithVision } from '../services/openai';
import {
  POKEMON_TYPES,
  EVOLUTION_STAGES,
  GROWTH_RATES,
  EGG_GROUPS,
  BODY_SHAPES,
  POKEMON_COLORS,
  DEFAULT_STATS,
  STAT_MIN,
  STAT_MAX,
  DEFAULT_CATCH_RATE,
  DEFAULT_BASE_FRIENDSHIP,
  DEFAULT_EGG_CYCLES,
} from '../utils/constants';

// Props for this component
interface CreatePokemonProps {
  editMode?: boolean; // Are we editing an existing Pokémon?
  existingPokemon?: Pokemon; // If editing, the existing Pokémon data
}

function CreatePokemon({ editMode = false, existingPokemon }: CreatePokemonProps) {
  const navigate = useNavigate();

  // Current step in the multi-step form (1-6)
  const [currentStep, setCurrentStep] = useState(1);

  // Form handling with React Hook Form
  const { register, handleSubmit, watch, formState: { errors } } = useForm<PokemonFormData>({
    defaultValues: editMode && existingPokemon ? existingPokemon : {
      // Default values for new Pokémon
      ...DEFAULT_STATS,
      typePrimary: 'Normal',
      catchRate: DEFAULT_CATCH_RATE,
      baseFriendship: DEFAULT_BASE_FRIENDSHIP,
      eggCycles: DEFAULT_EGG_CYCLES,
      heightUnit: 'feet',
      weightUnit: 'pounds',
    }
  });

  // State for image upload and AI generation
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string>('');
  const [aiGeneratedImage, setAiGeneratedImage] = useState<string>(existingPokemon?.aiGeneratedImageUrl || '');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageDescription, setImageDescription] = useState('');

  // State for form submission
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Watch total stats to display sum
  const hp = watch('hp') || 0;
  const attack = watch('attack') || 0;
  const defense = watch('defense') || 0;
  const specialAttack = watch('specialAttack') || 0;
  const specialDefense = watch('specialDefense') || 0;
  const speed = watch('speed') || 0;
  const totalStats = hp + attack + defense + specialAttack + specialDefense + speed;

  // Handle image file selection
  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setUploadedImagePreview(previewUrl);
    }
  }

  // Generate AI image from uploaded drawing
  async function handleGenerateImage() {
    if (!uploadedImage) {
      alert('Please upload a drawing first!');
      return;
    }

    try {
      setIsGeneratingImage(true);
      setSaveError(null);

      // Call OpenAI API with the uploaded image and description
      const imageUrl = await generatePokemonImageWithVision(uploadedImage, imageDescription || undefined);

      setAiGeneratedImage(imageUrl);

      alert('🎉 Your Pokémon art has been generated! Click "Accept Image" if you like it, or "Try Again" to regenerate.');
    } catch (error) {
      console.error('Error generating image:', error);
      setSaveError('Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  }

  // Form submission
  async function onSubmit(data: PokemonFormData) {
    // Allow saving without AI image - it's now optional!
    // This ensures work isn't lost if image generation fails

    try {
      setIsSaving(true);
      setSaveError(null);

      // Upload the original drawing to storage if we have one
      let originalDrawingUrl = existingPokemon?.originalDrawingUrl;
      if (uploadedImage) {
        originalDrawingUrl = await uploadImage(uploadedImage, 'pokemon-images');
      }

      // Prepare Pokemon data
      const pokemonData: Omit<Pokemon, 'id' | 'createdAt' | 'updatedAt'> = {
        ...data,
        originalDrawingUrl,
        aiGeneratedImageUrl: aiGeneratedImage || undefined, // Optional now!
      };

      // Create or update Pokemon in database
      if (editMode && existingPokemon?.id) {
        await updatePokemon(existingPokemon.id, pokemonData);
        alert(`✨ ${data.name} has been updated successfully!`);
        navigate(`/pokemon/${existingPokemon.id}`);
      } else {
        const newPokemon = await createPokemon(pokemonData);
        alert(`🎉 Congratulations! ${data.name} has been created!`);
        navigate(`/pokemon/${newPokemon.id}`);
      }
    } catch (error) {
      console.error('Error saving Pokémon:', error);
      setSaveError('Failed to save Pokémon. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  // Navigation between steps
  function nextStep() {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          {editMode ? '✏️ Edit Your Pokémon' : '✨ Create Your Pokémon'}
        </h1>
        <p className="text-xl text-gray-600">
          {editMode ? 'Make changes to your Pokémon' : "Let's bring your creation to life!"}
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className={`
                flex-1 h-2 mx-1 rounded-full transition-colors
                ${step <= currentStep ? 'bg-blue-500' : 'bg-gray-300'}
              `}
            />
          ))}
        </div>
        <p className="text-center text-gray-600 font-bold">
          Step {currentStep} of 6
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl shadow-xl p-8">

        {/* STEP 1: BASIC INFO */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              1️⃣ Basic Information
            </h2>

            {/* Name */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Pokémon Name *
              </label>
              <input
                type="text"
                {...register('name', { required: 'Name is required' })}
                className="input-field"
                placeholder="e.g., Flameburst"
              />
              {errors.name && (
                <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Pokédex Number */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Pokédex Number
              </label>
              <input
                type="number"
                {...register('pokedexNumber', { valueAsNumber: true })}
                className="input-field"
                placeholder="e.g., 001"
              />
              <p className="text-sm text-gray-500 mt-1">
                Optional - You can assign a number to your Pokémon
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Category/Classification
              </label>
              <input
                type="text"
                {...register('category')}
                className="input-field"
                placeholder="e.g., Fire Cat Pokémon"
              />
              <p className="text-sm text-gray-500 mt-1">
                What kind of creature is it? (Optional)
              </p>
            </div>

            {/* Primary Type */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Primary Type *
              </label>
              <select
                {...register('typePrimary', { required: 'Primary type is required' })}
                className="input-field"
              >
                {POKEMON_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Secondary Type */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Secondary Type
              </label>
              <select
                {...register('typeSecondary')}
                className="input-field"
              >
                <option value="">None</option>
                {POKEMON_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Optional - Some Pokémon have two types
              </p>
            </div>

            {/* Color */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Main Color
              </label>
              <select
                {...register('color')}
                className="input-field"
              >
                <option value="">Choose a color...</option>
                {POKEMON_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* STEP 2: PHYSICAL CHARACTERISTICS */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              2️⃣ Physical Characteristics
            </h2>

            {/* Height */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Height
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  {...register('heightValue', { valueAsNumber: true })}
                  className="input-field flex-1"
                  placeholder="e.g., 2.5"
                />
                <select
                  {...register('heightUnit')}
                  className="input-field w-32"
                >
                  <option value="feet">Feet</option>
                  <option value="meters">Meters</option>
                </select>
              </div>
            </div>

            {/* Weight */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Weight
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  {...register('weightValue', { valueAsNumber: true })}
                  className="input-field flex-1"
                  placeholder="e.g., 45.5"
                />
                <select
                  {...register('weightUnit')}
                  className="input-field w-32"
                >
                  <option value="pounds">Pounds</option>
                  <option value="kilograms">Kilograms</option>
                </select>
              </div>
            </div>

            {/* Body Shape */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Body Shape
              </label>
              <select
                {...register('shape')}
                className="input-field"
              >
                <option value="">Choose a shape...</option>
                {BODY_SHAPES.map((shape) => (
                  <option key={shape} value={shape}>
                    {shape}
                  </option>
                ))}
              </select>
            </div>

            {/* Pokédex Entry */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Pokédex Entry / Description
              </label>
              <textarea
                {...register('pokedexEntry')}
                className="input-field min-h-32"
                placeholder="Write a 2-3 sentence description of your Pokémon. What makes it special? What can it do?"
              />
              <p className="text-sm text-gray-500 mt-1">
                Example: "Flameburst loves to play in volcanoes. Its tail flame burns brighter when it's happy!"
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: BATTLE STATS */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              3️⃣ Battle Stats
            </h2>

            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="font-bold text-blue-800">
                💡 Stats range from 1-255. Higher numbers = stronger!
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Total Stats: <span className="font-bold text-xl">{totalStats}</span>
              </p>
            </div>

            {/* HP */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                HP (Hit Points) *
              </label>
              <input
                type="number"
                {...register('hp', {
                  required: 'HP is required',
                  min: { value: STAT_MIN, message: `Min HP is ${STAT_MIN}` },
                  max: { value: STAT_MAX, message: `Max HP is ${STAT_MAX}` },
                  valueAsNumber: true
                })}
                className="input-field"
                placeholder="e.g., 45"
              />
              {errors.hp && (
                <p className="text-red-600 text-sm mt-1">{errors.hp.message}</p>
              )}
            </div>

            {/* Attack */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Attack *
              </label>
              <input
                type="number"
                {...register('attack', {
                  required: 'Attack is required',
                  min: { value: STAT_MIN, message: `Min Attack is ${STAT_MIN}` },
                  max: { value: STAT_MAX, message: `Max Attack is ${STAT_MAX}` },
                  valueAsNumber: true
                })}
                className="input-field"
                placeholder="e.g., 49"
              />
              {errors.attack && (
                <p className="text-red-600 text-sm mt-1">{errors.attack.message}</p>
              )}
            </div>

            {/* Defense */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Defense *
              </label>
              <input
                type="number"
                {...register('defense', {
                  required: 'Defense is required',
                  min: { value: STAT_MIN, message: `Min Defense is ${STAT_MIN}` },
                  max: { value: STAT_MAX, message: `Max Defense is ${STAT_MAX}` },
                  valueAsNumber: true
                })}
                className="input-field"
                placeholder="e.g., 49"
              />
              {errors.defense && (
                <p className="text-red-600 text-sm mt-1">{errors.defense.message}</p>
              )}
            </div>

            {/* Special Attack */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Special Attack *
              </label>
              <input
                type="number"
                {...register('specialAttack', {
                  required: 'Special Attack is required',
                  min: { value: STAT_MIN, message: `Min Special Attack is ${STAT_MIN}` },
                  max: { value: STAT_MAX, message: `Max Special Attack is ${STAT_MAX}` },
                  valueAsNumber: true
                })}
                className="input-field"
                placeholder="e.g., 65"
              />
              {errors.specialAttack && (
                <p className="text-red-600 text-sm mt-1">{errors.specialAttack.message}</p>
              )}
            </div>

            {/* Special Defense */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Special Defense *
              </label>
              <input
                type="number"
                {...register('specialDefense', {
                  required: 'Special Defense is required',
                  min: { value: STAT_MIN, message: `Min Special Defense is ${STAT_MIN}` },
                  max: { value: STAT_MAX, message: `Max Special Defense is ${STAT_MAX}` },
                  valueAsNumber: true
                })}
                className="input-field"
                placeholder="e.g., 65"
              />
              {errors.specialDefense && (
                <p className="text-red-600 text-sm mt-1">{errors.specialDefense.message}</p>
              )}
            </div>

            {/* Speed */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Speed *
              </label>
              <input
                type="number"
                {...register('speed', {
                  required: 'Speed is required',
                  min: { value: STAT_MIN, message: `Min Speed is ${STAT_MIN}` },
                  max: { value: STAT_MAX, message: `Max Speed is ${STAT_MAX}` },
                  valueAsNumber: true
                })}
                className="input-field"
                placeholder="e.g., 45"
              />
              {errors.speed && (
                <p className="text-red-600 text-sm mt-1">{errors.speed.message}</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: ABILITIES */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              4️⃣ Abilities
            </h2>

            <div className="bg-purple-50 p-4 rounded-lg mb-6">
              <p className="font-bold text-purple-800">
                💡 Abilities are special powers your Pokémon has!
              </p>
              <p className="text-sm text-purple-700">
                Give your Pokémon 1-3 abilities. Each ability needs a name and what it does.
              </p>
            </div>

            {/* Ability 1 */}
            <div className="border-2 border-purple-200 rounded-lg p-4">
              <h3 className="font-bold text-lg text-purple-800 mb-3">Ability 1</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  {...register('ability1.name')}
                  className="input-field"
                  placeholder="Ability name (e.g., Blaze)"
                />
                <textarea
                  {...register('ability1.description')}
                  className="input-field min-h-20"
                  placeholder="What does this ability do?"
                />
              </div>
            </div>

            {/* Ability 2 */}
            <div className="border-2 border-purple-200 rounded-lg p-4">
              <h3 className="font-bold text-lg text-purple-800 mb-3">Ability 2 (Optional)</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  {...register('ability2.name')}
                  className="input-field"
                  placeholder="Second ability name"
                />
                <textarea
                  {...register('ability2.description')}
                  className="input-field min-h-20"
                  placeholder="What does this ability do?"
                />
              </div>
            </div>

            {/* Hidden Ability */}
            <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
              <h3 className="font-bold text-lg text-yellow-800 mb-3">Hidden Ability (Optional)</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  {...register('hiddenAbility.name')}
                  className="input-field"
                  placeholder="Hidden ability name"
                />
                <textarea
                  {...register('hiddenAbility.description')}
                  className="input-field min-h-20"
                  placeholder="What does this hidden ability do?"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: EVOLUTION & BREEDING */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              5️⃣ Evolution & Breeding
            </h2>

            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <p className="font-bold text-green-800">
                💡 These fields are all optional!
              </p>
              <p className="text-sm text-green-700">
                Fill in if your Pokémon evolves or you want to add breeding details.
              </p>
            </div>

            {/* Evolution Stage */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Evolution Stage
              </label>
              <select
                {...register('evolutionStage')}
                className="input-field"
              >
                <option value="">Choose...</option>
                {EVOLUTION_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>

            {/* Evolves From */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Evolves From
              </label>
              <input
                type="text"
                {...register('evolvesFrom')}
                className="input-field"
                placeholder="Previous evolution (if any)"
              />
            </div>

            {/* Evolves Into */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Evolves Into
              </label>
              <input
                type="text"
                {...register('evolvesInto')}
                className="input-field"
                placeholder="Next evolution (if any)"
              />
            </div>

            {/* Evolution Method */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Evolution Method
              </label>
              <input
                type="text"
                {...register('evolutionMethod')}
                className="input-field"
                placeholder="e.g., Level 16, Fire Stone, Friendship"
              />
            </div>

            {/* Egg Groups */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Egg Group 1
              </label>
              <select
                {...register('eggGroup1')}
                className="input-field"
              >
                <option value="">Choose...</option>
                {EGG_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Egg Group 2 (Optional)
              </label>
              <select
                {...register('eggGroup2')}
                className="input-field"
              >
                <option value="">None</option>
                {EGG_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender Ratio */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Gender Ratio
              </label>
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Male %</label>
                  <input
                    type="number"
                    {...register('genderRatioMale', { valueAsNumber: true })}
                    className="input-field"
                    placeholder="0-100"
                    min="0"
                    max="100"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Female %</label>
                  <input
                    type="number"
                    {...register('genderRatioFemale', { valueAsNumber: true })}
                    className="input-field"
                    placeholder="0-100"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              <label className="flex items-center mt-3">
                <input
                  type="checkbox"
                  {...register('isGenderless')}
                  className="mr-2 w-5 h-5"
                />
                <span className="text-gray-700">This Pokémon is genderless</span>
              </label>
            </div>

            {/* Game Mechanics */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-2">
                  Catch Rate (0-255)
                </label>
                <input
                  type="number"
                  {...register('catchRate', { valueAsNumber: true })}
                  className="input-field"
                  min="0"
                  max="255"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-2">
                  Base Friendship (0-255)
                </label>
                <input
                  type="number"
                  {...register('baseFriendship', { valueAsNumber: true })}
                  className="input-field"
                  min="0"
                  max="255"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Growth Rate
              </label>
              <select
                {...register('growthRate')}
                className="input-field"
              >
                <option value="">Choose...</option>
                {GROWTH_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* STEP 6: IMAGE UPLOAD & AI GENERATION */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              6️⃣ Create Your Pokémon Art! 🎨
            </h2>

            <div className="bg-yellow-50 p-4 rounded-lg mb-6">
              <p className="font-bold text-yellow-800">
                🖍️ Draw your Pokémon on paper, take a photo, and upload it here!
              </p>
              <p className="text-sm text-yellow-700">
                Our AI will turn your drawing into amazing Pokémon art!
              </p>
            </div>

            {/* Image Upload */}
            <div className="border-4 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50">
              <div className="text-6xl mb-4">📸</div>
              <label className="btn-pokemon inline-block cursor-pointer">
                {uploadedImage ? 'Change Drawing' : 'Upload Your Drawing'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  capture="environment"
                />
              </label>
              {uploadedImage && (
                <p className="mt-4 text-green-600 font-bold">
                  ✅ Drawing uploaded: {uploadedImage.name}
                </p>
              )}
            </div>

            {/* Preview of uploaded drawing */}
            {uploadedImagePreview && (
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
                <h3 className="font-bold text-xl text-yellow-800 mb-4 text-center">
                  🎨 Your Original Drawing
                </h3>
                <div className="bg-white rounded-lg p-4 shadow-lg">
                  <img
                    src={uploadedImagePreview}
                    alt="Your drawing"
                    className="w-full max-w-md mx-auto rounded-lg"
                  />
                </div>
                <p className="text-center text-yellow-700 mt-4 text-sm">
                  This drawing will be saved and shown alongside the AI-generated image! 📸
                </p>
              </div>
            )}

            {/* Description (optional) */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Describe Your Pokémon (Optional)
              </label>
              <textarea
                value={imageDescription}
                onChange={(e) => setImageDescription(e.target.value)}
                className="input-field min-h-24"
                placeholder="Help the AI understand your vision! What colors, features, or mood should it have?"
              />
            </div>

            {/* Generate Button */}
            <button
              type="button"
              onClick={handleGenerateImage}
              disabled={!uploadedImage || isGeneratingImage}
              className={`
                w-full py-4 rounded-lg font-bold text-xl transition-all
                ${uploadedImage && !isGeneratingImage
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {isGeneratingImage ? '⚡ Creating Magic... (This takes 30-60 seconds)' : '✨ Generate AI Art!'}
            </button>

            {/* AI Generated Image Preview with Side-by-Side Comparison */}
            {aiGeneratedImage && (
              <div className="border-4 border-green-400 rounded-lg p-6 bg-green-50">
                <h3 className="font-bold text-2xl text-green-800 mb-6 text-center">
                  🎉 Amazing! See the Transformation! 🎉
                </h3>

                {/* Side-by-side comparison */}
                {uploadedImagePreview && (
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {/* Original Drawing */}
                    <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                      <div className="bg-yellow-400 px-4 py-2 text-center">
                        <span className="font-bold text-gray-800">🎨 Your Drawing</span>
                      </div>
                      <div className="p-4">
                        <img
                          src={uploadedImagePreview}
                          alt="Original Drawing"
                          className="w-full rounded-lg"
                        />
                      </div>
                    </div>

                    {/* AI Generated */}
                    <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                      <div className="bg-green-400 px-4 py-2 text-center">
                        <span className="font-bold text-gray-800">🤖 AI Generated</span>
                      </div>
                      <div className="p-4">
                        <img
                          src={aiGeneratedImage}
                          alt="AI Generated Pokémon"
                          className="w-full rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* If no original preview, just show AI image */}
                {!uploadedImagePreview && (
                  <img
                    src={aiGeneratedImage}
                    alt="AI Generated Pokémon"
                    className="w-full max-w-md mx-auto rounded-lg shadow-2xl mb-4"
                  />
                )}

                <p className="text-center text-green-800 font-bold mb-4">
                  ✨ Both images will be saved so you can see your creative journey! ✨
                </p>

                <div className="flex gap-4 justify-center">
                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    🔄 Try Again
                  </button>
                  <button
                    type="button"
                    onClick={() => {}}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    ✅ Accept Image
                  </button>
                </div>
              </div>
            )}

            {saveError && (
              <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 text-red-700">
                ⚠️ {saveError}
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 mt-8 pt-6 border-t-2 border-gray-200">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-6 rounded-lg transition-colors"
            >
              ← Previous
            </button>
          )}

          {currentStep < 6 && (
            <button
              type="button"
              onClick={nextStep}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Next →
            </button>
          )}

          {currentStep === 6 && (
            <button
              type="submit"
              disabled={isSaving}
              className={`
                flex-1 font-bold py-3 px-6 rounded-lg transition-all
                ${!isSaving
                  ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {isSaving ? '💾 Saving...' : `${editMode ? '💾 Update' : '🎉 Create'} Pokémon!`}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default CreatePokemon;
