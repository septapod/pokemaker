/**
 * OpenAI Service
 *
 * This file is the frontend interface for AI-powered image generation and analysis.
 * All API calls are now routed through Vercel serverless backend functions for
 * secure, server-side API key management. The API key is NEVER exposed to the browser.
 *
 * Backend endpoints:
 * - POST /api/generate-image - Generate a Pokémon image using GPT-4o image generation
 * - POST /api/analyze-image - Analyze a Pokémon image using GPT-4o Vision
 */

import { generatePokemonImage as generateImage, analyzePokemonImage } from './api-client';
import { AI_IMAGE_PROMPT_TEMPLATE, TYPE_AESTHETICS, PROMPT_DESCRIPTORS } from '../utils/constants';
import type { PokemonType, EvolutionStage } from '../types/pokemon.types';

/**
 * Generate a Pokémon-style image using the backend API
 *
 * @param _imageFile - The user's uploaded drawing (currently unused - backend generates from description)
 * @param description - Optional text description to guide the AI
 * @returns URL of the generated image
 */
export async function generatePokemonImage(
  _imageFile: File,
  description?: string
): Promise<string> {
  try {
    // Build the prompt
    const prompt = buildPrompt(description);

    console.log('Generating Pokémon image via backend API...');

    // Call backend API for image generation (uses GPT-4o image generation server-side)
    const response = await generateImage(prompt);

    if (!response.imageUrl) {
      throw new Error('No image URL returned from backend');
    }

    console.log('Image generated successfully!');
    return response.imageUrl;

  } catch (error: any) {
    console.error('Error generating Pokémon image:', {
      message: error?.message,
      fullError: error
    });

    // Provide more specific error message
    let errorMessage = 'Failed to generate image. ';
    if (error?.message?.includes('safety system') || error?.message?.includes('flagged')) {
      errorMessage = 'The AI safety system flagged this request. Try using a simpler description or saving without AI image generation.';
    } else if (error?.message?.includes('Rate limit')) {
      errorMessage += 'Rate limit exceeded. Please try again later.';
    } else if (error?.message) {
      errorMessage += error.message;
    } else {
      errorMessage += 'Please try again.';
    }

    throw new Error(errorMessage);
  }
}

/**
 * Analyze a Pokémon image using GPT-4o Vision via the backend API
 *
 * Converts image to base64, sends to backend for Vision analysis, then generates
 * a new AI image based on the analysis results and user description.
 * The Vision API analysis happens server-side using the secure API key.
 *
 * @param imageFile - The image file to analyze
 * @param userDescription - Optional user description to guide analysis
 * @param typePrimary - Primary Pokémon type (affects visual aesthetic)
 * @param evolutionStage - Evolution stage (Basic, Stage 1, Stage 2)
 * @returns Base64-encoded image data for the generated Pokémon image
 */
export async function generatePokemonImageWithVision(
  imageFile: File,
  userDescription?: string,
  typePrimary?: PokemonType,
  evolutionStage?: EvolutionStage
): Promise<string> {
  try {
    // Step 1: Convert image to base64
    console.log('Converting image to base64...');
    const base64Image = await fileToBase64(imageFile);

    // Extract base64 data from data URL
    const base64Data = base64Image.split(',')[1] || base64Image;
    const mediaType = imageFile.type || 'image/png';

    // Step 2: Send to backend for Vision analysis (includes userDescription inline)
    console.log('Analyzing image via backend API...');
    const analysis = await analyzePokemonImage(base64Data, mediaType, userDescription);

    // Step 3: Build final prompt for GPT-4o image generation
    // GPT-4o can handle detailed prompts with style instructions
    console.log('Visual analysis from drawing:', analysis.visualDescription);

    // Get dynamic descriptor based on type and evolution stage
    const descriptor = getPromptDescriptor(typePrimary, evolutionStage);
    console.log('Using descriptor:', descriptor, 'for type:', typePrimary, 'evolution:', evolutionStage);

    const finalPrompt = `Create a safe and family-friendly ${descriptor} fantasy creature for a children's game with these exact physical features:

${analysis.visualDescription}
${userDescription ? `User specified: ${userDescription}` : ''}

Art style: Anime/manga style with bold outlines, Japanese monster-collecting game aesthetic (like Pokemon), vibrant saturated colors, white background, front-facing view.

Design requirements:
- Professional, polished, and clean
- Colorful and cheerful
- Appropriate for all ages
- Safe for children

ABSOLUTE REQUIREMENTS - NO EXCEPTIONS:
- ZERO text anywhere in the image
- ZERO words, letters, or labels of any kind
- ZERO title or name text
- ZERO annotation boxes or descriptions
- ZERO watermarks or signatures
- ONLY draw the creature itself - nothing else
- Pure visual illustration with no written content whatsoever`;

    console.log('Generating new Pokémon image from analyzed drawing...');
    console.log('Final prompt length:', finalPrompt.length);
    console.log('Sending to GPT-4o image generation:', finalPrompt);
    const imageResponse = await generateImage(finalPrompt);

    if (!imageResponse.imageUrl) {
      throw new Error('No image URL returned from image generation');
    }

    // Step 4: Extract base64 data from data URL
    console.log('Extracting base64 data from data URL...');
    // imageResponse.imageUrl is in format: "data:image/png;base64,<base64data>"
    const generatedBase64Data = imageResponse.imageUrl.split(',')[1];

    if (!generatedBase64Data) {
      throw new Error('Invalid data URL format');
    }

    // Return the base64 data
    return generatedBase64Data;

  } catch (error: any) {
    console.error('Error analyzing Pokémon image:', {
      message: error?.message,
      fullError: error
    });

    // Provide more specific error message
    let errorMessage = 'Failed to analyze image. ';
    if (error?.message?.includes('safety system') || error?.message?.includes('flagged')) {
      errorMessage = 'The AI safety system flagged this request. Try: 1) Using a clearer image, 2) Uploading a different photo.';
    } else if (error?.message?.includes('Rate limit')) {
      errorMessage += 'Rate limit exceeded. Please try again in a few minutes.';
    } else if (error?.message) {
      errorMessage += error.message;
    } else {
      errorMessage += 'Please try again.';
    }

    throw new Error(errorMessage);
  }
}

/**
 * Helper function to convert File to base64 data URL
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Get the appropriate prompt descriptor based on type and evolution stage
 * Falls back to 'cute, playful' (basic-friendly) if parameters are missing
 */
function getPromptDescriptor(
  typePrimary?: PokemonType,
  evolutionStage?: EvolutionStage
): string {
  // Default to basic-friendly if no type provided
  if (!typePrimary) {
    return PROMPT_DESCRIPTORS['basic-friendly'];
  }

  // Determine if evolved (Stage 1 or Stage 2)
  const isEvolved = evolutionStage === 'Stage 1' || evolutionStage === 'Stage 2';

  // Get type aesthetic category
  const category = TYPE_AESTHETICS[typePrimary] || 'friendly';

  // Build descriptor key
  const key = `${isEvolved ? 'evolved' : 'basic'}-${category}` as keyof typeof PROMPT_DESCRIPTORS;

  return PROMPT_DESCRIPTORS[key];
}


/**
 * Build the AI prompt for image generation
 */
function buildPrompt(userDescription?: string): string {
  let prompt = AI_IMAGE_PROMPT_TEMPLATE;

  if (userDescription) {
    prompt += `\n\nCreature description: ${userDescription}`;
  }

  return prompt;
}

/**
 * Convert base64 image data to a File object
 * (Used after AI image generation to upload to Supabase)
 */
export function base64ToFile(base64: string, filename: string): File {
  // Convert base64 to binary
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/png' });
  return new File([blob], filename, { type: 'image/png' });
}

/**
 * @deprecated - Use base64ToFile instead to avoid CORS issues
 * Download an image URL and convert it to a File object
 * (Useful for saving the generated image to Supabase)
 */
export async function urlToFile(url: string, filename: string): Promise<File> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
}
