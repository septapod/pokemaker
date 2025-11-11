/**
 * OpenAI Service
 *
 * This file is the frontend interface for AI-powered image generation and analysis.
 * All API calls are now routed through Vercel serverless backend functions for
 * secure, server-side API key management. The API key is NEVER exposed to the browser.
 *
 * Backend endpoints:
 * - POST /api/generate-image - Generate a Pokémon image using DALL-E 3
 * - POST /api/analyze-image - Analyze a Pokémon image using GPT-4o Vision
 */

import { generatePokemonImage as generateImage, analyzePokemonImage } from './api-client';
import { AI_IMAGE_PROMPT_TEMPLATE } from '../utils/constants';

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

    // Call backend API for image generation (uses DALL-E 3 server-side)
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
 * @returns Base64-encoded image data for the generated Pokémon image
 */
export async function generatePokemonImageWithVision(
  imageFile: File,
  userDescription?: string
): Promise<string> {
  try {
    // Step 1: Convert image to base64
    console.log('Converting image to base64...');
    const base64Image = await fileToBase64(imageFile);

    // Extract base64 data from data URL
    const base64Data = base64Image.split(',')[1] || base64Image;
    const mediaType = imageFile.type || 'image/png';

    // Step 2: Send to backend for Vision analysis
    console.log('Analyzing image via backend API...');
    const analysis = await analyzePokemonImage(base64Data, mediaType);

    // Step 3: Build prompt combining analysis + user description
    console.log('Analysis complete:', analysis);
    console.log('Pokemon data from analysis:', analysis);

    // Combine the analyzed visual description with any user-provided description
    let generationPrompt = AI_IMAGE_PROMPT_TEMPLATE;

    // Add physical appearance from vision analysis (truncate if needed)
    if (analysis.description) {
      const truncatedDescription = analysis.description.substring(0, 300);
      generationPrompt += `\n\nVisual appearance: ${truncatedDescription}`;
    }

    // Add/emphasize user's custom description
    if (userDescription) {
      const truncatedUserDesc = userDescription.substring(0, 200);
      generationPrompt += `\n\nUser description: ${truncatedUserDesc}`;
    }

    // Step 4: Generate a new Pokémon image using DALL-E based on the analysis
    console.log('Generating new Pokémon image from analyzed drawing...');
    const imageResponse = await generateImage(generationPrompt);

    if (!imageResponse.imageUrl) {
      throw new Error('No image URL returned from image generation');
    }

    // Step 5: Convert the generated image URL back to base64 for processing
    console.log('Converting generated image to base64...');
    const generatedImageResponse = await fetch(imageResponse.imageUrl);
    const generatedImageBlob = await generatedImageResponse.blob();
    const generatedBase64 = await blobToBase64(generatedImageBlob);

    // Return just the base64 data (without the data URL prefix)
    return generatedBase64.split(',')[1] || generatedBase64;

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
 * Helper function to convert Blob to base64 data URL
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
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
