/**
 * Vercel Serverless Function: Generate Pokémon Image
 *
 * This endpoint generates a Pokémon image using DALL-E 3.
 * API key is stored server-side and never exposed to the browser.
 *
 * POST /api/generate-image
 * Request body: { description: string }
 * Response: { imageUrl: string, revisionNumber: number }
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { openai } from './_lib/openai-client.js';
import { handleOpenAIError } from './_lib/error-handler.js';
import type { GenerateImageRequest, GenerateImageResponse, ErrorResponse } from '../src/types/api.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({
      error: {
        message: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED',
      },
    });
  }

  try {
    const { description } = request.body as GenerateImageRequest;

    // Validate request
    if (!description || typeof description !== 'string') {
      return response.status(400).json({
        error: {
          message: 'Missing or invalid description field',
          code: 'INVALID_REQUEST',
        },
      });
    }

    if (description.length < 10) {
      return response.status(400).json({
        error: {
          message: 'Description must be at least 10 characters long',
          code: 'INVALID_REQUEST',
        },
      });
    }

    if (description.length > 4000) {
      return response.status(400).json({
        error: {
          message: 'Description must not exceed 4000 characters (DALL-E 3 limit)',
          code: 'INVALID_REQUEST',
        },
      });
    }

    // Call GPT-4o image generation via OpenAI API (uses gpt-image-1 model)
    // Pass the description directly - it's already properly formatted by the frontend
    // Note: gpt-image-1 returns b64_json by default (doesn't accept response_format param)
    const imageResponse = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: description,
      n: 1,
      size: '1024x1024',
    });

    // GPT-4o image generation returns b64_json, not url
    const base64Image = imageResponse.data[0]?.b64_json;
    if (!base64Image) {
      throw new Error('No image data returned from image generation');
    }

    // Convert base64 to data URL for frontend
    const imageUrl = `data:image/png;base64,${base64Image}`;

    return response.status(200).json({
      imageUrl,
      revisionNumber: 1,
    });
  } catch (error) {
    const { errorMessage, errorCode } = handleOpenAIError(error);

    return response.status(500).json({
      error: {
        message: errorMessage,
        code: errorCode || 'GENERATION_FAILED',
      },
    });
  }
}
