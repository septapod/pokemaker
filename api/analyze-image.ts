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
              text: `This is a drawing for a family-friendly creature creation app. Analyze this drawing and describe what you see LITERALLY and ACCURATELY, using positive, whimsical language.

CRITICAL: If the drawing looks like a BODY PART (nose, ear, eye, mouth, etc.), describe it as that body part literally. Be accurate first, whimsical second.

Focus on:
- Accurate identification of shapes (if it looks like a nose, call it a nose)
- Colors (bright, cheerful)
- Key features (feet, legs, wings, tail, etc.)
- Use positive, friendly language

CRITICAL RULES:
- NEVER mention what is missing ("no eyes", "without arms")
- ONLY describe what IS visible
- Be LITERAL about unusual shapes (giant nose = "giant nose", not "bean-shaped")

GOOD examples:
- "Giant nose with tiny feet" ✓
- "Large ear with stubby legs" ✓
- "Oval body with playful feet" ✓

BAD examples:
- "Bean-shaped creature with big nose" ❌ (should be "giant nose with feet")
- "Round body, no eyes or arms" ❌ (never mention what's missing)

Return ONLY valid JSON:
{
  "visualDescription": "concise, accurate, positive description"
}

Keep under 120 characters. Be accurate and literal while staying positive.`,
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

    // Truncate description to ensure it doesn't exceed limits (keep under 120 for combined prompt)
    if (analysis.visualDescription.length > 120) {
      analysis.visualDescription = analysis.visualDescription.substring(0, 117) + '...';
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
