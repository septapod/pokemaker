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

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { Pokemon, PokemonFormData } from '../types/pokemon.types';
import { createPokemon, updatePokemon, uploadImage } from '../services/supabase';
import { generatePokemonImageWithVision, urlToFile } from '../services/openai';
import {
  POKEMON_TYPES,
  EVOLUTION_STAGES,
  EGG_GROUPS,
  BODY_SHAPES,
  STAT_MIN,
  STAT_MAX,
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

  // Track saved Pokemon ID for draft saves (so we update instead of creating duplicates)
  const [savedPokemonId, setSavedPokemonId] = useState<string | undefined>(existingPokemon?.id);

  // Form handling with React Hook Form
  const { register, handleSubmit, watch, getValues, setValue, formState: { errors } } = useForm<PokemonFormData>({
    defaultValues: editMode && existingPokemon ? existingPokemon : {
      // Default values for new Pokémon
      typePrimary: 'Normal',
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

  // State for form submission
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // State for auto-save functionality
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Watch total stats to display sum
  const hp = watch('hp') || 0;
  const attack = watch('attack') || 0;
  const defense = watch('defense') || 0;
  const specialAttack = watch('specialAttack') || 0;
  const specialDefense = watch('specialDefense') || 0;
  const speed = watch('speed') || 0;
  const totalStats = hp + attack + defense + specialAttack + specialDefense + speed;

  // Watch evolution stage to conditionally show "Evolves From" field
  const evolutionStage = watch('evolutionStage');

  // Handle image file selection - uploads immediately to Supabase for persistence
  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Create preview URL for immediate display
        const previewUrl = URL.createObjectURL(file);
        setUploadedImagePreview(previewUrl);
        setUploadedImage(file);

        // Upload immediately to Supabase Storage to ensure it persists
        const permanentUrl = await uploadImage(file, 'pokemon-images');

        // Update form with the permanent URL
        setValue('originalDrawingUrl', permanentUrl);

        console.log('✅ Original drawing uploaded successfully:', permanentUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        setSaveError('Failed to upload image. Please try again.');
      }
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

      // Combine physical appearance and personality/mood descriptions from form
      const formData = getValues();
      let combinedDescription = '';
      if (formData.physicalAppearance) {
        combinedDescription += `Physical features: ${formData.physicalAppearance}`;
      }
      if (formData.imageDescription) {
        if (combinedDescription) combinedDescription += '\n\n';
        combinedDescription += `Personality/mood: ${formData.imageDescription}`;
      }

      // Call OpenAI API with the uploaded image and combined description
      const temporaryImageUrl = await generatePokemonImageWithVision(
        uploadedImage,
        combinedDescription || undefined
      );

      // Download the image from OpenAI and upload to Supabase Storage
      // (OpenAI URLs expire after 2 hours, so we need a permanent URL)
      const imageFile = await urlToFile(temporaryImageUrl, 'ai-generated.png');
      const permanentImageUrl = await uploadImage(imageFile, 'pokemon-images');

      setAiGeneratedImage(permanentImageUrl);

      // Image generation successful - UI will show the result automatically
    } catch (error: any) {
      console.error('Error generating image:', error);
      // Show the actual error message from the error
      const errorMessage = error?.message || 'Failed to generate image. Please try again.';
      setSaveError(errorMessage);
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

      // Original drawing already uploaded immediately on selection
      // Use the URL from form data (set by handleImageUpload)
      const originalDrawingUrl = data.originalDrawingUrl || existingPokemon?.originalDrawingUrl;

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
    } catch (error: any) {
      console.error('Error saving Pokémon:', error);
      // Show the actual error message from the error
      const errorMessage = error?.message || 'Failed to save Pokémon. Please try again.';
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }

  // Save Draft - captures ALL form data, STAYS on form to continue editing
  async function handleSaveDraft() {
    try {
      setIsSaving(true);
      setSaveError(null);

      // Get ALL form values from React Hook Form's internal state
      const allFormData = getValues();

      // Original drawing already uploaded immediately on selection
      // Use the URL from form data (set by handleImageUpload)
      const originalDrawingUrl = allFormData.originalDrawingUrl || existingPokemon?.originalDrawingUrl;

      // Prepare Pokemon data
      const pokemonData: Omit<Pokemon, 'id' | 'createdAt' | 'updatedAt'> = {
        ...allFormData,
        originalDrawingUrl,
        aiGeneratedImageUrl: aiGeneratedImage || undefined,
      };

      // Create or update Pokemon in database
      if (savedPokemonId) {
        // Update existing Pokemon (either from edit mode or previously saved draft)
        await updatePokemon(savedPokemonId, pokemonData);
        alert(`✅ Draft saved! You can continue editing ${allFormData.name || 'your Pokemon'}.`);
      } else {
        // Create new Pokemon for the first time
        const newPokemon = await createPokemon(pokemonData);
        setSavedPokemonId(newPokemon.id); // Track ID for future saves
        alert(`✅ Draft saved! You can continue editing ${allFormData.name || 'your Pokemon'}.`);
      }
      // Stay on the form so user can continue editing!
    } catch (error: any) {
      console.error('Error saving draft:', error);
      const errorMessage = error?.message || 'Failed to save draft. Please try again.';
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }

  // Auto-save function - silently saves in background without navigation
  async function autoSave() {
    try {
      setAutoSaveStatus('saving');

      // Get ALL form values
      const allFormData = getValues();

      // Skip auto-save if Pokemon has no name yet
      if (!allFormData.name || allFormData.name.trim() === '') {
        setAutoSaveStatus('saved');
        return;
      }

      // Original drawing already uploaded immediately on selection
      // Use the URL from form data (set by handleImageUpload)
      const originalDrawingUrl = allFormData.originalDrawingUrl || existingPokemon?.originalDrawingUrl;

      // Prepare Pokemon data
      const pokemonData: Omit<Pokemon, 'id' | 'createdAt' | 'updatedAt'> = {
        ...allFormData,
        originalDrawingUrl,
        aiGeneratedImageUrl: aiGeneratedImage || undefined,
      };

      // Create or update Pokemon in database
      if (savedPokemonId) {
        await updatePokemon(savedPokemonId, pokemonData);
      } else {
        const newPokemon = await createPokemon(pokemonData);
        setSavedPokemonId(newPokemon.id);
      }

      setAutoSaveStatus('saved');
      setLastAutoSave(new Date());
      setSaveError(null);
    } catch (error: any) {
      console.error('Auto-save error:', error);
      setAutoSaveStatus('error');
      // Don't show error to user for auto-save failures
    }
  }

  // Watch all form values and trigger auto-save when they change
  useEffect(() => {
    // Subscribe to all form changes
    const subscription = watch(() => {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout to save after 3 seconds of inactivity
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSave();
      }, 3000);
    });

    // Cleanup on unmount
    return () => {
      subscription.unsubscribe();
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [savedPokemonId, uploadedImage, aiGeneratedImage]); // Re-run when these dependencies change

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
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          {editMode ? '✏️ Edit Your Pokémon' : '✨ Create Your Pokémon'}
        </h1>
        <p className="text-xl text-gray-600">
          {editMode ? 'Make changes to your Pokémon' : "Let's bring your creation to life!"}
        </p>
      </div>

      {/* Auto-Save Status Indicator */}
      <div className="flex justify-center mb-4">
        <div className={`
          px-4 py-2 rounded-full text-sm font-medium transition-all
          ${autoSaveStatus === 'saving' ? 'bg-blue-100 text-blue-700' : ''}
          ${autoSaveStatus === 'saved' ? 'bg-green-100 text-green-700' : ''}
          ${autoSaveStatus === 'error' ? 'bg-red-100 text-red-700' : ''}
        `}>
          {autoSaveStatus === 'saving' && '💾 Saving...'}
          {autoSaveStatus === 'saved' && lastAutoSave && (
            <>✅ All changes saved at {lastAutoSave.toLocaleTimeString()}</>
          )}
          {autoSaveStatus === 'saved' && !lastAutoSave && (
            <>✅ Auto-save enabled</>
          )}
          {autoSaveStatus === 'error' && '⚠️ Auto-save failed - use Save Draft button'}
        </div>
      </div>

      {/* Save Draft Button - Always Visible - Captures ALL form data */}
      <div className="flex justify-center mb-6">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isSaving}
          className={`
            px-6 py-3 rounded-lg font-bold text-lg transition-all shadow-md
            ${isSaving
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-xl transform hover:scale-105'
            }
          `}
        >
          {isSaving ? '💾 Saving...' : '💾 Save Draft'}
        </button>
      </div>

      {/* Error Message Display */}
      {saveError && (
        <div className="mb-6 bg-red-50 border-2 border-red-400 rounded-lg p-4 text-red-700">
          ⚠️ {saveError}
        </div>
      )}

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
                {...register('typePrimary')}
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
                HP (Hit Points)
              </label>
              <input
                type="number"
                {...register('hp', {
                  min: { value: STAT_MIN, message: `Min HP is ${STAT_MIN}` },
                  max: { value: STAT_MAX, message: `Max HP is ${STAT_MAX}` },
                  valueAsNumber: true
                })}
                className="input-field"
                placeholder="Leave blank if unsure"
              />
              <p className="text-sm text-gray-500 mt-1">Optional - Range: 1-255</p>
              {errors.hp && (
                <p className="text-red-600 text-sm mt-1">{errors.hp.message}</p>
              )}
            </div>

            {/* Attack */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Attack
              </label>
              <input
                type="number"
                {...register('attack', {
                  min: { value: STAT_MIN, message: `Min Attack is ${STAT_MIN}` },
                  max: { value: STAT_MAX, message: `Max Attack is ${STAT_MAX}` },
                  valueAsNumber: true
                })}
                className="input-field"
                placeholder="Leave blank if unsure"
              />
              <p className="text-sm text-gray-500 mt-1">Optional - Range: 1-255</p>
              {errors.attack && (
                <p className="text-red-600 text-sm mt-1">{errors.attack.message}</p>
              )}
            </div>

            {/* Defense */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Defense
              </label>
              <input
                type="number"
                {...register('defense', {
                  min: { value: STAT_MIN, message: `Min Defense is ${STAT_MIN}` },
                  max: { value: STAT_MAX, message: `Max Defense is ${STAT_MAX}` },
                  valueAsNumber: true
                })}
                className="input-field"
                placeholder="Leave blank if unsure"
              />
              <p className="text-sm text-gray-500 mt-1">Optional - Range: 1-255</p>
              {errors.defense && (
                <p className="text-red-600 text-sm mt-1">{errors.defense.message}</p>
              )}
            </div>

            {/* Special Attack */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Special Attack
              </label>
              <input
                type="number"
                {...register('specialAttack', {
                  min: { value: STAT_MIN, message: `Min Special Attack is ${STAT_MIN}` },
                  max: { value: STAT_MAX, message: `Max Special Attack is ${STAT_MAX}` },
                  valueAsNumber: true
                })}
                className="input-field"
                placeholder="Leave blank if unsure"
              />
              <p className="text-sm text-gray-500 mt-1">Optional - Range: 1-255</p>
              {errors.specialAttack && (
                <p className="text-red-600 text-sm mt-1">{errors.specialAttack.message}</p>
              )}
            </div>

            {/* Special Defense */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Special Defense
              </label>
              <input
                type="number"
                {...register('specialDefense', {
                  min: { value: STAT_MIN, message: `Min Special Defense is ${STAT_MIN}` },
                  max: { value: STAT_MAX, message: `Max Special Defense is ${STAT_MAX}` },
                  valueAsNumber: true
                })}
                className="input-field"
                placeholder="Leave blank if unsure"
              />
              <p className="text-sm text-gray-500 mt-1">Optional - Range: 1-255</p>
              {errors.specialDefense && (
                <p className="text-red-600 text-sm mt-1">{errors.specialDefense.message}</p>
              )}
            </div>

            {/* Speed */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Speed
              </label>
              <input
                type="number"
                {...register('speed', {
                  min: { value: STAT_MIN, message: `Min Speed is ${STAT_MIN}` },
                  max: { value: STAT_MAX, message: `Max Speed is ${STAT_MAX}` },
                  valueAsNumber: true
                })}
                className="input-field"
                placeholder="Leave blank if unsure"
              />
              <p className="text-sm text-gray-500 mt-1">Optional - Range: 1-255</p>
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

            {/* Evolves From - Only show if NOT Basic stage */}
            {evolutionStage && evolutionStage !== 'Basic' && (
              <div>
                <label className="block font-bold text-gray-700 mb-2">
                  Evolves From
                </label>
                <input
                  type="text"
                  {...register('evolvesFrom')}
                  className="input-field"
                  placeholder="Previous evolution"
                />
              </div>
            )}

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

            {/* Physical Appearance (for AI) */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Physical Appearance (Optional)
              </label>
              <textarea
                {...register('physicalAppearance')}
                className="input-field min-h-24"
                placeholder="Describe colors, patterns, textures, markings, body features... (e.g., 'bright orange body with yellow lightning bolt stripes, fuzzy texture, large round eyes')"
              />
              <p className="text-sm text-gray-500 mt-1">
                💡 Tip: Focus on visual details the AI can draw - colors, shapes, patterns, textures
              </p>
            </div>

            {/* Description (optional) */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Personality & Mood (Optional)
              </label>
              <textarea
                {...register('imageDescription')}
                className="input-field min-h-24"
                placeholder="How should it feel? (e.g., 'friendly and cheerful', 'mysterious and wise', 'energetic and playful')"
              />
              <p className="text-sm text-gray-500 mt-1">
                💡 Tip: Describe the creature's personality or the mood you want to convey
              </p>
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

            {/* Loading Indicator */}
            {isGeneratingImage && (
              <div className="mt-6 bg-purple-50 border-2 border-purple-300 rounded-lg p-8">
                <div className="flex flex-col items-center justify-center">
                  {/* Animated Spinner */}
                  <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
                  </div>

                  {/* Loading Text */}
                  <div className="text-center">
                    <p className="text-xl font-bold text-purple-800 mb-2 animate-pulse">
                      ✨ Creating Your Creature Art ✨
                    </p>
                    <p className="text-md text-purple-600">
                      Analyzing your drawing and generating professional artwork...
                    </p>
                    <p className="text-sm text-purple-500 mt-2">
                      This usually takes 30-60 seconds
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                    onClick={() => {
                      // Scroll to the bottom to show the Create Pokemon button
                      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    ✅ Accept & Continue
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
