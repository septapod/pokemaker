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
 * Converts image to base64, sends to backend, and receives Pokemon data.
 * The Vision API analysis happens server-side using the secure API key.
 *
 * @param imageFile - The image file to analyze
 * @param userDescription - Optional user description to guide analysis
 * @returns Base64-encoded image data for further processing
 */
export async function generatePokemonImageWithVision(
  imageFile: File,
  _userDescription?: string
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

    // Step 3: For now, analysis is returned to calling code
    // In a full implementation, you'd use the analysis data to create/update a Pokémon
    console.log('Analysis complete:', analysis);
    console.log('Pokemon data from analysis:', analysis);

    // Note: For full implementation, this would generate an image using the analysis
    // For now, return empty string as placeholder since the real Pokemon data is in analysis
    return '';

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
