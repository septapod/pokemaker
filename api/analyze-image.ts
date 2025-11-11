/**
 * Vercel Serverless Function: Analyze Pokémon Image
 *
 * This endpoint analyzes a Pokémon image using GPT-4o Vision.
 * API key is stored server-side and never exposed to the browser.
 *
 * POST /api/analyze-image
 * Request body: { imageBase64: string, imageMediaType: string }
 * Response: { name, type, stats, abilities, description }
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { openai } from './_lib/openai-client.js';
import { handleOpenAIError } from './_lib/error-handler.js';
import type { AnalyzeImageRequest, AnalyzeImageResponse, ErrorResponse } from '../src/types/api.js';

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
    const { imageBase64, imageMediaType, userDescription } = request.body as AnalyzeImageRequest;

    // Validate request
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return response.status(400).json({
        error: {
          message: 'Missing or invalid imageBase64 field',
          code: 'INVALID_REQUEST',
        },
      });
    }

    if (!imageMediaType || typeof imageMediaType !== 'string') {
      return response.status(400).json({
        error: {
          message: 'Missing or invalid imageMediaType field',
          code: 'INVALID_REQUEST',
        },
      });
    }

    // Build Vision prompt with user description inline (from working version)
    const visionPrompt = `This is a child's drawing for a family-friendly creature creation app. Analyze this cute creature drawing and describe what you see in a positive, child-appropriate way.

Focus on these family-friendly aspects:
- Body shape and features (cute, friendly characteristics)
- Colors (bright, cheerful)
- Elemental type it might be (fire/water/grass/electric/nature/etc)
- Personality/mood (friendly, playful, cheerful)
- Unique characteristics that make it special
${userDescription ? `The young creator says: "${userDescription}"` : ''}

Provide a concise 2-3 sentence description (maximum 250 characters) for creating a professional, kid-friendly fantasy creature illustration suitable for all ages in an anime/manga art style. Be brief and direct.`;

    // Call GPT-4o with Vision to analyze the Pokémon image
    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${imageMediaType};base64,${imageBase64}`,
              },
            },
            {
              type: 'text',
              text: visionPrompt,
            },
          ],
        },
      ],
      max_tokens: 150,
    });

    const content = analysisResponse.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from GPT-4o Vision');
    }

    // Truncate to 250 chars to prevent overly long descriptions
    let description = content.trim();
    if (description.length > 250) {
      description = description.substring(0, 247) + '...';
    }

    // Return plain text description (not JSON format - from working version)
    const analysis: AnalyzeImageResponse = {
      visualDescription: description,
    };

    return response.status(200).json(analysis);
  } catch (error) {
    const { errorMessage, errorCode } = handleOpenAIError(error);

    return response.status(500).json({
      error: {
        message: errorMessage,
        code: errorCode || 'ANALYSIS_FAILED',
      },
    });
  }
}
