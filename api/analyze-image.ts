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
    // Describe accurately without over-interpreting
    const visionPrompt = `You are analyzing a drawing of a creature. Describe what you see accurately using body part terms.

  RULES:
  - Be accurate to what's actually drawn - don't interpret or assume
  - Use body part terms: head, eyes, body, arms, legs, antennae, teeth, etc.
  - Describe size relationships: large eyes, small body, thin legs, etc.
  - Mention specific features: glasses, teeth, spikes, patterns, etc.
  - Keep it concise and factual (20-30 words)
  - NO animal comparisons unless extremely obvious
  - NO geometric terms like "oval", "circle", "lines"
  - NO negative descriptions ("lacks", "without", "missing")
  - NO drawing style descriptions ("simple", "minimalist")
  - Example: "A creature with a round head, oversized glasses covering large eyes, visible front teeth, small round body, and thin arms and legs"

  ${userDescription ? `Context from artist: "${userDescription}"` : ''}

  Describe the creature you see:`;

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
