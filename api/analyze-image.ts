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
    const { imageBase64, imageMediaType } = request.body as AnalyzeImageRequest;

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
              text: `Describe ONLY the physical, visual characteristics of this creature drawing. Focus on what you can SEE, not concepts or personality.

Describe these VISUAL details:
- Overall body shape (round, oval, angular, etc.)
- Size proportions (head to body ratio, limb sizes)
- Physical features (number and shape of eyes, limbs, appendages)
- Colors (specific shades, where each color appears)
- Surface texture (smooth, fuzzy, scaly, rough)
- Patterns or markings (stripes, spots, gradients)
- Facial features (eye shape, mouth shape, nose if any)

Provide a purely visual, physical description with NO personality traits, NO elemental types, NO mood descriptions, NO abstract concepts. Just describe what the creature physically looks like.

Return ONLY valid JSON:
{
  "visualDescription": "detailed physical visual description"
}

Be thorough and detailed about physical characteristics. Aim for 300-800 characters to provide rich detail.`,
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

    // Parse the JSON response
    let analysis: AnalyzeImageResponse;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse GPT-4o response:', content);
      throw new Error('Failed to parse image analysis result');
    }

    // Validate the response structure
    if (!analysis.visualDescription) {
      throw new Error('Invalid response structure from GPT-4o Vision - missing visualDescription');
    }

    // Truncate description if it's excessively long (allow up to 1500 chars since DALL-E 3 supports 4000)
    if (analysis.visualDescription.length > 1500) {
      console.warn('Visual description too long, truncating from', analysis.visualDescription.length);
      analysis.visualDescription = analysis.visualDescription.substring(0, 1497) + '...';
    }

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
