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
import { createPokemon, updatePokemon, uploadImage, findOrCreatePokemonByName } from '../services/supabase';
import { generatePokemonImageWithVision, base64ToFile } from '../services/openai';
import {
  POKEMON_TYPES,
  EVOLUTION_STAGES,
  EGG_GROUPS,
  BODY_SHAPES,
  STAT_MIN,
  STAT_MAX,
  DEFAULT_EGG_CYCLES,
  TYPE_ICONS,
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

  // Track if this is a fresh creation (not editing or continuing)
  const [isFreshCreation, setIsFreshCreation] = useState<boolean>(!editMode && !existingPokemon?.id);

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

  // Load image state from localStorage on mount
  // Only restore if continuing an existing draft or editing an existing Pokemon
  useEffect(() => {
    const savedImageState = localStorage.getItem('pokemonImageState');
    console.log('Loading from localStorage:', savedImageState ? 'Found saved state' : 'No saved state');
    console.log('Edit mode:', editMode, 'Saved Pokemon ID:', savedPokemonId, 'Fresh creation:', isFreshCreation);

    // If this is a fresh creation, clear localStorage and any stale state
    if (isFreshCreation) {
      console.log('Fresh creation detected - clearing localStorage and state');
      localStorage.removeItem('pokemonImageState');
      setUploadedImagePreview('');
      setAiGeneratedImage('');
      setValue('originalDrawingUrl', '');
      return; // Don't restore anything
    }

    // Only restore if in edit mode or if we have a savedPokemonId (continuing a draft)
    if (savedImageState && (editMode || savedPokemonId)) {
      try {
        const { permanentUrl, generated } = JSON.parse(savedImageState);
        console.log('Restoring images - Edit mode or continuing draft');
        console.log('Restored permanent URL:', permanentUrl ? `${permanentUrl.substring(0, 50)}...` : 'none');
        console.log('Restored generated:', generated ? 'yes' : 'no');
        // Use permanent Supabase URL for preview (survives page refresh)
        if (permanentUrl) {
          setUploadedImagePreview(permanentUrl);
          setValue('originalDrawingUrl', permanentUrl);
        }
        if (generated) setAiGeneratedImage(generated);
      } catch (e) {
        console.error('Failed to restore image state from localStorage', e);
      }
    }
  }, [setValue, editMode, savedPokemonId, isFreshCreation]);

  // Save image state to localStorage whenever it changes
  // Store permanent Supabase URL, not blob URL, so it survives page refresh
  // Only save if NOT a fresh creation, or if user has actually uploaded/generated images
  useEffect(() => {
    const originalDrawingUrl = watch('originalDrawingUrl');

    // Don't save if it's a fresh creation with no user-uploaded content
    if (isFreshCreation && !originalDrawingUrl && !aiGeneratedImage) {
      console.log('Skipping localStorage save - fresh creation with no images');
      return;
    }

    // Once user uploads or generates an image, it's no longer a "fresh" creation
    if (isFreshCreation && (originalDrawingUrl || aiGeneratedImage)) {
      console.log('User has added images - no longer a fresh creation');
      setIsFreshCreation(false);
    }

    const imageState = {
      permanentUrl: originalDrawingUrl, // Use Supabase URL, not blob URL
      generated: aiGeneratedImage,
    };
    console.log('Saving to localStorage:', imageState);
    localStorage.setItem('pokemonImageState', JSON.stringify(imageState));
  }, [watch('originalDrawingUrl'), aiGeneratedImage, watch, isFreshCreation]);

  // State for auto-save functionality
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Watch gender ratio - automatically sync male/female to always equal 100%
  const genderRatioMale = watch('genderRatioMale') || 0;

  // Auto-sync female ratio to complement male ratio
  useEffect(() => {
    if (genderRatioMale !== undefined && genderRatioMale !== null) {
      const femaleRatio = 100 - genderRatioMale;
      setValue('genderRatioFemale', femaleRatio);
    }
  }, [genderRatioMale, setValue]);

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

        console.log('Original drawing uploaded successfully:', permanentUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        setSaveError('Failed to upload image. Please try again.');
      }
    }
  }

  // Generate AI image from uploaded drawing
  async function handleGenerateImage() {
    // Use uploaded image, or convert preview to file if refreshed
    let imageToUse = uploadedImage;
    if (!imageToUse && uploadedImagePreview) {
      // Convert data URL back to File for regeneration after refresh
      const response = await fetch(uploadedImagePreview);
      const blob = await response.blob();
      imageToUse = new File([blob], 'drawing.png', { type: 'image/png' });
    }

    if (!imageToUse) {
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
      // Returns base64 image data (not a URL) to avoid CORS issues
      const base64ImageData = await generatePokemonImageWithVision(
        imageToUse,
        combinedDescription || undefined
      );

      // Convert base64 to File and upload to Supabase Storage
      // (This gives us a permanent URL that won't expire)
      const imageFile = base64ToFile(base64ImageData, 'ai-generated.png');
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
      let finalPokemonId: string;
      if (editMode && existingPokemon?.id) {
        // Editing an existing Pokemon
        await updatePokemon(existingPokemon.id, pokemonData);
        finalPokemonId = existingPokemon.id;
        alert(`${data.name} has been updated successfully!`);
      } else if (savedPokemonId) {
        // Finalizing a draft that was auto-saved
        await updatePokemon(savedPokemonId, pokemonData);
        finalPokemonId = savedPokemonId;
        alert(`Congratulations! ${data.name} has been created!`);
      } else {
        // Creating brand new Pokemon (no prior auto-save)
        const newPokemon = await createPokemon(pokemonData);
        finalPokemonId = newPokemon.id!;
        alert(`Congratulations! ${data.name} has been created!`);
      }

      // Link evolutions (create/find related Pokemon and link them)
      await linkEvolutions(finalPokemonId, pokemonData);

      // Clear localStorage so next creation starts fresh
      console.log('Pokemon saved successfully, clearing localStorage');
      localStorage.removeItem('pokemonImageState');

      // Navigate to the Pokemon detail page
      navigate(`/pokemon/${finalPokemonId}`);
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
      let draftPokemonId: string;
      if (savedPokemonId) {
        // Update existing Pokemon (either from edit mode or previously saved draft)
        await updatePokemon(savedPokemonId, pokemonData);
        draftPokemonId = savedPokemonId;
        alert(`Draft saved! You can continue editing ${allFormData.name || 'your Pokemon'}.`);
      } else {
        // Create new Pokemon for the first time
        const newPokemon = await createPokemon(pokemonData);
        draftPokemonId = newPokemon.id!;
        setSavedPokemonId(newPokemon.id); // Track ID for future saves
        alert(`Draft saved! You can continue editing ${allFormData.name || 'your Pokemon'}.`);
      }

      // Link evolutions (create/find related Pokemon and link them)
      await linkEvolutions(draftPokemonId, pokemonData);

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

  // Link evolution Pokemon together
  // If "Evolves Into" or "Evolves From" is set, create or find that Pokemon and link them
  async function linkEvolutions(_pokemonId: string, pokemonData: Omit<Pokemon, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      // Handle "Evolves Into"
      if (pokemonData.evolvesInto) {
        const evolutionPokemon = await findOrCreatePokemonByName(pokemonData.evolvesInto);
        if (evolutionPokemon) {
          // Update the evolution Pokemon to have this one as "Evolves From"
          await updatePokemon(evolutionPokemon.id!, {
            evolvesFrom: pokemonData.name,
            evolutionStage: pokemonData.evolutionStage === 'Basic' ? 'Stage 1' : 'Stage 2',
          });
          console.log(`Linked ${pokemonData.name} → ${evolutionPokemon.name}`);
        }
      }

      // Handle "Evolves From"
      if (pokemonData.evolvesFrom) {
        const priorEvolutionPokemon = await findOrCreatePokemonByName(pokemonData.evolvesFrom);
        if (priorEvolutionPokemon) {
          // Update the prior evolution Pokemon to have this one as "Evolves Into"
          await updatePokemon(priorEvolutionPokemon.id!, {
            evolvesInto: pokemonData.name,
          });
          console.log(`Linked ${priorEvolutionPokemon.name} → ${pokemonData.name}`);
        }
      }
    } catch (error) {
      console.error('Error linking evolutions:', error);
      // Don't throw - linking evolutions shouldn't prevent save
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
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
          {editMode ? <><i className="ri-edit-line text-4xl"></i> Edit Your Pokémon</> : <><i className="ri-magic-line text-4xl"></i> Create Your Pokémon</>}
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
          {autoSaveStatus === 'saving' && <><i className="ri-save-line"></i> Saving...</>}
          {autoSaveStatus === 'saved' && lastAutoSave && (
            <><i className="ri-checkbox-circle-line"></i> All changes saved at {lastAutoSave.toLocaleTimeString()}</>
          )}
          {autoSaveStatus === 'saved' && !lastAutoSave && (
            <><i className="ri-checkbox-circle-line"></i> Auto-save enabled</>
          )}
          {autoSaveStatus === 'error' && <><i className="ri-alert-line"></i> Auto-save failed - use Save Draft button</>}
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
          <i className="ri-save-line"></i> {isSaving ? 'Saving...' : 'Save Draft'}
        </button>
      </div>

      {/* Error Message Display */}
      {saveError && (
        <div className="mb-6 bg-red-50 border-2 border-red-400 rounded-lg p-4 text-red-700 flex items-center gap-2">
          <i className="ri-alert-line"></i> {saveError}
        </div>
      )}

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setCurrentStep(step)}
              className={`
                flex-1 h-3 mx-1 rounded-full transition-all cursor-pointer hover:scale-105
                ${step === currentStep ? 'bg-blue-600 shadow-lg' : step < currentStep ? 'bg-blue-400' : 'bg-gray-300'}
              `}
              title={`Go to step ${step}`}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-600 mb-2 px-1">
          {['Basic', 'Physical', 'Stats', 'Abilities', 'Evolution', 'Image'].map((label, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStep(idx + 1)}
              className={`
                flex-1 text-center font-semibold hover:text-blue-600 transition-colors cursor-pointer
                ${currentStep === idx + 1 ? 'text-blue-600' : ''}
              `}
            >
              {label}
            </button>
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
              <span className="step-number">1</span> Basic Information
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
              <p className="text-sm text-gray-500 mt-1">
                The species name or nickname of the Pokémon. Example: Pikachu, Charizard, Mewtwo. Required.
              </p>
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
                A unique identifier assigned to each Pokémon species in numerical order. Example: #001 Bulbasaur, #025 Pikachu. Optional.
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
                A descriptive title for the Pokémon's species type. Example: "Mouse Pokémon" (Pikachu), "Seed Pokémon" (Bulbasaur). Optional.
              </p>
            </div>

            {/* Primary Type */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Primary Type *
              </label>
              <input
                type="hidden"
                {...register('typePrimary')}
              />
              <div className="flex flex-wrap gap-2">
                {POKEMON_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setValue('typePrimary', type)}
                    className={`px-3 py-2 rounded-lg font-semibold text-sm flex items-center gap-1 transition-all ${
                      watch('typePrimary') === type
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <i className={`${TYPE_ICONS[type]} text-lg`}></i> {type}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                The main elemental type that determines battle mechanics. Example: Fairy, Fire, Water, Grass, Electric. Required.
              </p>
            </div>

            {/* Secondary Type */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Secondary Type
              </label>
              <input
                type="hidden"
                {...register('typeSecondary')}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setValue('typeSecondary', undefined)}
                  className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                    !watch('typeSecondary')
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  None
                </button>
                {POKEMON_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setValue('typeSecondary', type)}
                    className={`px-3 py-2 rounded-lg font-semibold text-sm flex items-center gap-1 transition-all ${
                      watch('typeSecondary') === type
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <i className={`${TYPE_ICONS[type]} text-lg`}></i> {type}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                An optional second elemental type some Pokémon have. Example: Charizard is Fire/Flying, Gyarados is Water/Flying. Optional.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: PHYSICAL CHARACTERISTICS */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              <span className="step-number">2</span> Physical Characteristics
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
              <p className="text-sm text-gray-500 mt-1">
                The Pokémon's physical height measurement. Example: Pikachu is 1'4" (0.4m), Wailord is 47'7" (14.5m). Optional.
              </p>
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
              <p className="text-sm text-gray-500 mt-1">
                The Pokémon's body mass measurement. Example: Pikachu weighs 13.2 lbs (6.0 kg), Cosmoem weighs 2204.4 lbs (999.9 kg). Optional.
              </p>
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
              <p className="text-sm text-gray-500 mt-1">
                A classification system grouping Pokémon by physical form. Example: Bipedal with tail, Quadruped, Serpentine, Fish-like. Optional.
              </p>
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
                A 2-3 sentence description of the Pokémon's habitat, behavior, or abilities. Example: "Pikachu stores electricity in its cheeks". Optional.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: BATTLE STATS */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              <span className="step-number">3</span> Battle Stats
            </h2>

            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="font-bold text-blue-800 flex items-center gap-2">
                <i className="ri-lightbulb-line"></i> Stats range from 1-255. Higher numbers = stronger!
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
              <p className="text-sm text-gray-500 mt-1">
                Determines how much damage a Pokémon can take before fainting. Example: Blissey has 255 base HP, Shedinja has 1. Optional.
              </p>
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
              <p className="text-sm text-gray-500 mt-1">
                Determines physical move damage output. Example: Mega Mewtwo X has 190 base Attack, Chansey has 5. Optional.
              </p>
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
              <p className="text-sm text-gray-500 mt-1">
                Determines resistance to physical move damage. Example: Shuckle has 230 base Defense, Chansey has 5. Optional.
              </p>
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
              <p className="text-sm text-gray-500 mt-1">
                Determines special move damage output. Example: Mega Mewtwo Y has 194 base Special Attack. Optional.
              </p>
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
              <p className="text-sm text-gray-500 mt-1">
                Determines resistance to special move damage. Example: Shuckle has 230 base Special Defense. Optional.
              </p>
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
              <p className="text-sm text-gray-500 mt-1">
                Determines turn order in battle. Example: Regieleki has 200 base Speed, Shuckle has 5. Optional.
              </p>
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
              <span className="step-number">4</span> Abilities
            </h2>

            <div className="bg-purple-50 p-4 rounded-lg mb-6">
              <p className="font-bold text-purple-800 flex items-center gap-2">
                <i className="ri-lightbulb-line"></i> Abilities are special powers your Pokémon has!
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
              <span className="step-number">5</span> Evolution & Breeding
            </h2>

            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <p className="font-bold text-green-800 flex items-center gap-2">
                <i className="ri-lightbulb-line"></i> These fields are all optional!
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
              <p className="text-sm text-gray-500 mt-1">
                Indicates position in an evolutionary line (Basic, Stage 1, Stage 2). Example: Bulbasaur (Basic), Ivysaur (Stage 1), Venusaur (Stage 2). Optional.
              </p>
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
                <p className="text-sm text-gray-500 mt-1">
                  The prior Pokémon in the evolution chain, if any. Example: Charmeleon evolves from Charmander. Optional.
                </p>
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
              <p className="text-sm text-gray-500 mt-1">
                The next Pokémon in the evolution chain, if any. Example: Charmander evolves into Charmeleon. Optional.
              </p>
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
              <p className="text-sm text-gray-500 mt-1">
                How a Pokémon evolves (level, item, trade, etc.). Example: Level 16, Fire Stone, Trade with King's Rock. Optional.
              </p>
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
              <p className="text-sm text-gray-500 mt-1">
                Primary breeding category for compatibility. Example: Monster, Field, Water 1, Fairy, Dragon. Optional.
              </p>
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
              <p className="text-sm text-gray-500 mt-1">
                Optional secondary breeding category. Example: Charizard is in Monster and Dragon groups. Optional.
              </p>
            </div>

            {/* Gender Ratio */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Gender Ratio
              </label>
              <p className="text-sm text-gray-500 mb-4">
                The percentage chance of male vs. female. Example: Starters are 87.5% male/12.5% female, Pikachu is 50/50. Optional.
              </p>

              {/* Genderless Checkbox */}
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  {...register('isGenderless')}
                  className="mr-2 w-5 h-5"
                />
                <span className="text-gray-700">This Pokémon is genderless</span>
              </label>

              {/* Slider (only show if not genderless) */}
              {!watch('isGenderless') && (
                <div className="bg-gradient-to-r from-violet-50 to-cyan-50 p-4 rounded-lg border-2 border-purple-200">
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Adjust Male/Female Ratio
                    </label>
                    <input
                      type="range"
                      {...register('genderRatioMale', { valueAsNumber: true })}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #a78bfa 0%, #a78bfa ${genderRatioMale}%, #22d3ee ${genderRatioMale}%, #22d3ee 100%)`
                      }}
                      min="0"
                      max="100"
                      step="1"
                    />
                  </div>

                  {/* Display percentages */}
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex-1 bg-gradient-to-br from-violet-100 to-purple-100 p-3 rounded-lg text-center">
                      <div className="text-sm font-semibold text-purple-700">♂ Male</div>
                      <div className="text-2xl font-bold text-purple-600">{genderRatioMale}%</div>
                    </div>
                    <div className="text-gray-400 font-bold">vs</div>
                    <div className="flex-1 bg-gradient-to-br from-cyan-100 to-sky-100 p-3 rounded-lg text-center">
                      <div className="text-sm font-semibold text-cyan-700">♀ Female</div>
                      <div className="text-2xl font-bold text-cyan-600">{100 - genderRatioMale}%</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 6: CREATE YOUR POKÉMON ART */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center justify-center gap-2">
              <span className="step-number">6</span> Create Your Pokémon Art! <i className="ri-palette-line text-3xl text-blue-600"></i>
            </h2>

            <div className="bg-yellow-50 p-4 rounded-lg mb-6">
              <p className="font-bold text-yellow-800 flex items-center gap-2">
                <i className="ri-pencil-line"></i> Draw your Pokémon on paper, take a photo, and upload it here!
              </p>
              <p className="text-sm text-yellow-700">
                Your drawing will transform into amazing Pokémon art!
              </p>
            </div>

            {/* Image Upload */}
            <div className="border-4 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50">
              <div className="text-6xl mb-4"><i className="ri-camera-line text-blue-500"></i></div>
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
                <p className="mt-4 text-green-600 font-bold flex items-center justify-center gap-2">
                  <i className="ri-checkbox-circle-line"></i> Drawing uploaded: {uploadedImage.name}
                </p>
              )}
              {uploadedImagePreview && !uploadedImage && (
                <p className="mt-4 text-blue-600 font-bold flex items-center justify-center gap-2">
                  <i className="ri-refresh-line"></i> Drawing restored from previous session
                </p>
              )}
            </div>

            {/* Preview of uploaded drawing */}
            {uploadedImagePreview && (
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
                <h3 className="font-bold text-xl text-yellow-800 mb-4 text-center flex items-center justify-center gap-2">
                  <i className="ri-palette-line"></i> Your Original Drawing
                </h3>
                <div className="bg-white rounded-lg p-4 shadow-lg">
                  <img
                    src={uploadedImagePreview}
                    alt="Your drawing"
                    className="w-full max-w-md mx-auto rounded-lg"
                  />
                </div>
                <p className="text-center text-yellow-700 mt-4 text-sm flex items-center justify-center gap-2">
                  This drawing will be saved and shown alongside your magical new Pokémon! <i className="ri-camera-line"></i>
                </p>
              </div>
            )}

            {/* Physical Appearance */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Physical Appearance (Optional)
              </label>
              <textarea
                {...register('physicalAppearance')}
                className="input-field min-h-24"
                placeholder="Describe colors, patterns, textures, markings, body features... (e.g., 'bright orange body with yellow lightning bolt stripes, fuzzy texture, large round eyes')"
              />
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <i className="ri-lightbulb-line"></i> Tip: Focus on cool visual details - colors, shapes, patterns, textures
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
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <i className="ri-lightbulb-line"></i> Tip: Describe the creature's personality or the mood you want to convey
              </p>
            </div>

            {/* Generate Button */}
            <button
              type="button"
              onClick={handleGenerateImage}
              disabled={(!uploadedImage && !uploadedImagePreview) || isGeneratingImage}
              className={`
                w-full py-4 rounded-lg font-bold text-xl transition-all
                ${(uploadedImage || uploadedImagePreview) && !isGeneratingImage
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {isGeneratingImage ? <><i className="ri-sparkling-line"></i> Creating Magic... (This takes 30-60 seconds)</> : <><i className="ri-magic-line"></i> Transform My Drawing!</>}
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
                    <p className="text-xl font-bold text-purple-800 mb-2 animate-pulse flex items-center justify-center gap-2">
                      <i className="ri-magic-line"></i> Creating Your Creature Art <i className="ri-magic-line"></i>
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

            {/* Your New Pokémon Preview with Side-by-Side Comparison */}
            {aiGeneratedImage && (
              <div className="border-4 border-green-400 rounded-lg p-6 bg-green-50">
                <h3 className="font-bold text-2xl text-green-800 mb-6 text-center flex items-center justify-center gap-2">
                  <i className="ri-trophy-line"></i> Amazing! See the Transformation! <i className="ri-trophy-line"></i>
                </h3>

                {/* Side-by-side comparison */}
                {uploadedImagePreview && (
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {/* Original Drawing */}
                    <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                      <div className="bg-yellow-400 px-4 py-2 text-center flex items-center justify-center gap-2">
                        <i className="ri-palette-line"></i> <span className="font-bold text-gray-800">Your Drawing</span>
                      </div>
                      <div className="p-4">
                        <img
                          src={uploadedImagePreview}
                          alt="Original Drawing"
                          className="w-full rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Your New Pokémon */}
                    <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                      <div className="bg-green-400 px-4 py-2 text-center flex items-center justify-center gap-2">
                        <i className="ri-magic-line"></i> <span className="font-bold text-gray-800">Your Creation</span>
                      </div>
                      <div className="p-4">
                        <img
                          src={aiGeneratedImage}
                          alt="Your New Pokémon"
                          className="w-full rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* If no original preview, just show your new Pokémon image */}
                {!uploadedImagePreview && (
                  <img
                    src={aiGeneratedImage}
                    alt="Your New Pokémon"
                    className="w-full max-w-md mx-auto rounded-lg shadow-2xl mb-4"
                  />
                )}

                <p className="text-center text-green-800 font-bold mb-4 flex items-center justify-center gap-2">
                  <i className="ri-magic-line"></i> Both images will be saved so you can see your creative journey! <i className="ri-magic-line"></i>
                </p>

                <div className="flex gap-4 justify-center">
                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <i className="ri-refresh-line"></i> Try Again
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Scroll to the bottom to show the Create Pokemon button
                      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <i className="ri-checkbox-circle-line"></i> Accept & Continue
                  </button>
                </div>
              </div>
            )}

            {saveError && (
              <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 text-red-700 flex items-center gap-2">
                <i className="ri-alert-line"></i> {saveError}
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
                flex-1 font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2
                ${!isSaving
                  ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {isSaving ? <><i className="ri-save-line"></i> Saving...</> : <>{editMode ? <><i className="ri-save-line"></i> Update</> : <><i className="ri-trophy-line"></i> Create</>} Pokémon!</>}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default CreatePokemon;
