/**
 * Vercel Serverless Function: Fetch Image Proxy
 *
 * This endpoint proxies image fetching to avoid CORS issues.
 * It fetches images from external URLs (like OpenAI) server-side
 * and returns them as base64 data.
 *
 * POST /api/fetch-image
 * Request body: { imageUrl: string }
 * Response: { base64Data: string }
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import type { FetchImageRequest, FetchImageResponse, ErrorResponse } from '../src/types/api.js';

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
    } as ErrorResponse);
  }

  try {
    const { imageUrl } = request.body as FetchImageRequest;

    // Validate request
    if (!imageUrl || typeof imageUrl !== 'string') {
      return response.status(400).json({
        error: {
          message: 'Missing or invalid imageUrl field',
          code: 'INVALID_REQUEST',
        },
      } as ErrorResponse);
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch {
      return response.status(400).json({
        error: {
          message: 'Invalid URL format',
          code: 'INVALID_URL',
        },
      } as ErrorResponse);
    }

    // Fetch the image from the external URL
    console.log('Fetching image from:', imageUrl);
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    // Convert to buffer then to base64
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');

    // Return the base64 data
    const result: FetchImageResponse = {
      base64Data,
    };

    return response.status(200).json(result);
  } catch (error) {
    console.error('Error fetching image:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch image';

    return response.status(500).json({
      error: {
        message: errorMessage,
        code: 'FETCH_FAILED',
      },
    } as ErrorResponse);
  }
}