/**
 * API Client Service
 *
 * HTTP client for frontend to communicate with Vercel serverless backend functions.
 * All API keys remain server-side and are never exposed to the browser.
 */

import type {
  GenerateImageRequest,
  GenerateImageResponse,
  AnalyzeImageRequest,
  AnalyzeImageResponse,
  FetchImageRequest,
  FetchImageResponse,
  ErrorResponse,
} from '../types/api';

// Use production API when running locally (Vite dev server), otherwise use relative path
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'https://pokemaker.vercel.app/api'
  : '/api';

/**
 * Parse error response from API
 */
function parseErrorResponse(data: unknown): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const error = (data as ErrorResponse).error;
    return error?.message || 'An unknown error occurred';
  }
  return 'An unknown error occurred';
}

/**
 * Generate a Pokémon image using DALL-E 3
 * @param description - Description of the Pokémon to generate
 * @returns Promise with image URL and revision number
 */
export async function generatePokemonImage(description: string): Promise<GenerateImageResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description,
      } as GenerateImageRequest),
    });

    const data = (await response.json()) as GenerateImageResponse | ErrorResponse;

    if (!response.ok) {
      throw new Error(parseErrorResponse(data));
    }

    return data as GenerateImageResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate image');
  }
}

/**
 * Analyze a Pokémon image using GPT-4o Vision
 * @param imageBase64 - Base64-encoded image data
 * @param imageMediaType - MIME type of the image (e.g., 'image/png', 'image/jpeg')
 * @param userDescription - Optional user description to guide analysis
 * @returns Promise with analyzed Pokémon data
 */
export async function analyzePokemonImage(
  imageBase64: string,
  imageMediaType: string,
  userDescription?: string
): Promise<AnalyzeImageResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        imageMediaType,
        userDescription,
      } as AnalyzeImageRequest),
    });

    const data = (await response.json()) as AnalyzeImageResponse | ErrorResponse;

    if (!response.ok) {
      throw new Error(parseErrorResponse(data));
    }

    return data as AnalyzeImageResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to analyze image');
  }
}

/**
 * Fetch an external image via server-side proxy to avoid CORS issues
 * @param imageUrl - URL of the image to fetch
 * @returns Promise with base64-encoded image data
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<FetchImageResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/fetch-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl,
      } as FetchImageRequest),
    });

    const data = (await response.json()) as FetchImageResponse | ErrorResponse;

    if (!response.ok) {
      throw new Error(parseErrorResponse(data));
    }

    return data as FetchImageResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch image');
  }
}
