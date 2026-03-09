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
 * @returns Base64-encoded image data for the generated Pokémon image
 */
export async function generatePokemonImageWithVision(
  imageFile: File,
  userDescription?: string
): Promise<string> {
  try {
    // === STEP 1: Resize image ===
    let resizedFile: File;
    try {
      console.log('[vision] Step 1: Resizing image...', { name: imageFile.name, type: imageFile.type, size: imageFile.size });
      resizedFile = await resizeImageForUpload(imageFile, 1024);
      console.log('[vision] Step 1 OK:', { name: resizedFile.name, type: resizedFile.type, size: resizedFile.size });
    } catch (e: any) {
      throw new Error(`[Step 1 - resize] ${e.message}`);
    }

    // === STEP 2: Convert to base64 ===
    let base64Data: string;
    try {
      console.log('[vision] Step 2: Converting to base64...');
      const base64Image = await fileToBase64(resizedFile);
      base64Data = base64Image.startsWith('data:') ? base64Image.split(',')[1] || base64Image : base64Image;
      console.log('[vision] Step 2 OK: base64 length =', base64Data.length);
    } catch (e: any) {
      throw new Error(`[Step 2 - base64] ${e.message}`);
    }

    const mediaType = 'image/jpeg';

    // === STEP 3: Vision analysis ===
    let analysis: { visualDescription: string };
    try {
      console.log('[vision] Step 3: Sending to Vision API...');
      analysis = await analyzePokemonImage(base64Data, mediaType, userDescription);
      console.log('[vision] Step 3 OK:', analysis.visualDescription?.substring(0, 100));
    } catch (e: any) {
      throw new Error(`[Step 3 - vision API] ${e.message}`);
    }

    // === STEP 4: Generate image from description ===
    const finalPrompt = `Create a cute, family-friendly fantasy creature for a children's game with these exact physical features:

${analysis.visualDescription}
${userDescription ? `User specified: ${userDescription}` : ''}

Art style: Anime/manga style with bold outlines, Japanese monster-collecting game aesthetic (like Pokemon), vibrant saturated colors, white background, front-facing view.

Design requirements:
- Cute and friendly-looking
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

    let imageResponse;
    try {
      console.log('[vision] Step 4: Generating image, prompt length:', finalPrompt.length);
      imageResponse = await generateImage(finalPrompt);
      console.log('[vision] Step 4 OK: got response, imageUrl length =', imageResponse.imageUrl?.length);
    } catch (e: any) {
      throw new Error(`[Step 4 - image gen] ${e.message}`);
    }

    if (!imageResponse.imageUrl) {
      throw new Error('[Step 4] No image URL returned from image generation');
    }

    // === STEP 5: Extract base64 from data URL ===
    const generatedBase64Data = imageResponse.imageUrl.split(',')[1];
    if (!generatedBase64Data) {
      throw new Error('[Step 5] Invalid data URL format from image generation');
    }

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
 * Resize an image to fit within maxDimension (longest side) and compress as JPEG.
 * This keeps the base64 payload under Vercel's 4.5MB request body limit.
 * A 1024px JPEG at 0.8 quality is typically 100-300KB as base64.
 */
async function resizeImageForUpload(file: File, maxDimension: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;

      // Only downscale, never upscale
      if (w > maxDimension || h > maxDimension) {
        const scale = maxDimension / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error('Could not compress image'));
            return;
          }
          console.log(`Resized image: ${img.naturalWidth}x${img.naturalHeight} → ${w}x${h}, ${(blob.size / 1024).toFixed(0)}KB`);
          resolve(new File([blob], 'drawing.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.8
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load image for resizing'));
    };

    img.src = objectUrl;
  });
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
