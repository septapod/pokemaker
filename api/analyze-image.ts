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

    // Build Vision prompt optimized for DALL-E 3
    // DALL-E 3 works well with character-based descriptions (NOT geometric)
    const visionPrompt = `You are analyzing a drawing of a creature that will become a Pokemon. Describe what you see as a CHARACTER with features and body parts, NOT as geometric shapes.

  RULES:
  - Target 15-20 words total
  - Format as: "A [creature-type] Pokemon with [feature 1], [feature 2], and [feature 3]"
  - Describe it as a CREATURE with body parts (head, body, legs, tail, wings, ears, eyes, mouth, etc.)
  - Use natural language: "bird-like", "cat-like", "dragon-like", "hamster-like", "nose-shaped", etc.
  - Mention 2-3 specific distinguishing features
  - NO negative descriptions (don't say "lacks", "without", "missing", "no visible")
  - NO geometric terms like "curved shape", "oval", "lines", "circular"
  - NO interpretive words like "delightful", "whimsical", "playful"
  - NO drawing style descriptions like "minimalist", "monochrome", "simple sketch"
  - DO NOT describe HOW it's drawn, only WHAT the creature is
  - Include the word "Pokemon" in your description
  - Example: "A hamster-like Pokemon with oversized round glasses, large expressive eyes, and a chubby body"

  ${userDescription ? `Context from artist: "${userDescription}"` : ''}

  Describe the Pokemon creature you see:`;

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
