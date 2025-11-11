/**
 * API Request/Response Types
 *
 * Shared TypeScript interfaces for API request and response contracts
 * between frontend and Vercel serverless functions.
 */

/**
 * Request to generate a Pokémon image using DALL-E 3
 */
export interface GenerateImageRequest {
  description: string;
}

/**
 * Response from image generation endpoint
 */
export interface GenerateImageResponse {
  imageUrl: string;
  revisionNumber: number;
}

/**
 * Request to analyze a Pokémon image using GPT-4o Vision
 */
export interface AnalyzeImageRequest {
  imageBase64: string;
  imageMediaType: string;
}

/**
 * Response from image analysis endpoint
 */
export interface AnalyzeImageResponse {
  visualDescription: string;
}

/**
 * Error response format for all endpoints
 */
export interface ErrorResponse {
  error: {
    message: string;
    code: string;
  };
}
