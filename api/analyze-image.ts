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
    const visionPrompt = `This is a child's drawing for a family-friendly creature creation app. Analyze this drawing and describe what you see in a positive, child-appropriate way.

              Describe exactly what you see, literally. DO NOT INCLUDE THE CREATURE'S NAME. Do not add anything that is not captured in the visual. It is a child's drawing, so will almost always be a simple line-drawing. You don't need to describe that. Just provide a literal visual description of what you see.  Do not include anything but visual characteristics. Keep it simple.
              ${userDescription ? `The young creator says: "${userDescription}"` : ''}

              Provide a simple description for creating a kid-friendly fantasy creature illustration suitable for all ages in an anime/manga/ Japanese creature art style. Do not add any of your own interpretation`;

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
      max_tokens: 500,
    });

    const content = analysisResponse.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from GPT-4o Vision');
    }

    // Truncate if necessary to prevent overly long descriptions
    let description = content.trim();
    if (description.length > 400) {
      description = description.substring(0, 397) + '...';
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
