/**
 * OpenAI Service
 *
 * This file handles AI image generation using OpenAI's GPT-4o model.
 * It takes a user's drawing and optional description to create a professional
 * Pokémon-style illustration.
 */

import OpenAI from 'openai';
import { AI_IMAGE_PROMPT_TEMPLATE } from '../utils/constants';

// Get API key from environment variables
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

// Validate API key
if (!apiKey) {
  console.error('❌ Missing OpenAI API key. Please check your .env file.');
} else if (!apiKey.startsWith('sk-')) {
  console.error('❌ Invalid OpenAI API key format. Key should start with "sk-"');
} else if (apiKey.length < 20) {
  console.error('❌ OpenAI API key appears to be truncated or incomplete.');
} else {
  console.log('✅ OpenAI API key loaded successfully');
}

// Create OpenAI client
const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true // Note: In production, API calls should go through a backend
});

/**
 * Generate a Pokémon-style image using OpenAI's image generation
 *
 * @param imageFile - The user's uploaded drawing
 * @param description - Optional text description to guide the AI
 * @returns URL of the generated image
 */
export async function generatePokemonImage(
  _imageFile: File,
  description?: string
): Promise<string> {
  try {
    // Build the prompt
    const prompt = buildPrompt(description);

    console.log('Generating Pokémon image with OpenAI...');

    // Call OpenAI API for image generation using DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url',
    });

    // Get the generated image URL
    const imageUrl = response.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL returned from OpenAI');
    }

    console.log('Image generated successfully!');
    return imageUrl;

  } catch (error: any) {
    console.error('Error generating Pokémon image:', {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      type: error?.type,
      response: error?.response?.data,
      fullError: error
    });

    // Provide more specific error message
    let errorMessage = 'Failed to generate image. ';
    if (error?.code === 'content_policy_violation') {
      errorMessage = 'The AI safety system flagged this request. This is likely a false positive. Try using a simpler description or saving without AI image generation.';
    } else if (error?.status === 401) {
      errorMessage += 'Invalid API key. Please check your OpenAI API key.';
    } else if (error?.status === 429) {
      errorMessage += 'Rate limit exceeded. Please try again later.';
    } else if (error?.message) {
      errorMessage += error.message;
    } else {
      errorMessage += 'Please try again.';
    }

    throw new Error(errorMessage);
  }
}

/**
 * Alternative: Use GPT-4o Vision to analyze the drawing first,
 * then generate an image based on the analysis
 *
 * This is a more sophisticated approach that uses AI to understand
 * the drawing before generating the final image.
 */
export async function generatePokemonImageWithVision(
  imageFile: File,
  userDescription?: string
): Promise<string> {
  try {
    // Step 1: Analyze the drawing using GPT-4o Vision
    console.log('Analyzing drawing with GPT-4o Vision...');
    const base64Image = await fileToBase64(imageFile);

    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `This is a child's drawing for a family-friendly creature creation app. Analyze this cute creature drawing and describe what you see in a positive, child-appropriate way.

              Focus on these family-friendly aspects:
              - Body shape and features (cute, friendly characteristics)
              - Colors (bright, cheerful)
              - Elemental type it might be (fire/water/grass/electric/nature/etc)
              - Personality/mood (friendly, playful, cheerful)
              - Unique characteristics that make it special
              ${userDescription ? `The young creator says: "${userDescription}"` : ''}

              Provide a detailed, positive description for creating a professional, kid-friendly fantasy creature illustration suitable for all ages in an anime/manga art style.`
            },
            {
              type: 'image_url',
              image_url: {
                url: base64Image,
              }
            }
          ]
        }
      ],
      max_tokens: 500,
    });

    const aiAnalysis = analysisResponse.choices[0]?.message?.content;

    if (!aiAnalysis) {
      throw new Error('Failed to analyze image');
    }

    console.log('Analysis complete:', aiAnalysis);

    // Step 2: Generate image based on the analysis
    console.log('Generating final Pokémon illustration...');

    const finalPrompt = `Create a cute fantasy creature character with these specific visual characteristics:

${aiAnalysis}

Style: Anime/manga art style with bold outlines, vibrant colors, white background, front-facing view.

IMPORTANT: Generate ONLY the character illustration. Do NOT include any text, labels, watermarks, or written words in the image.`;

    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: finalPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'hd', // Use HD quality for better results
      response_format: 'url',
    });

    const imageUrl = imageResponse.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL returned from OpenAI');
    }

    console.log('Image generated successfully!');
    return imageUrl;

  } catch (error: any) {
    console.error('Error generating Pokémon image with vision:', {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      type: error?.type,
      response: error?.response?.data,
      fullError: error
    });

    // Provide more specific error message
    let errorMessage = 'Failed to generate image. ';
    if (error?.code === 'content_policy_violation') {
      errorMessage = 'The AI safety system flagged this request. This is likely a false positive. Try: 1) Using a simpler description, 2) Uploading a clearer drawing, or 3) Saving without AI image generation.';
    } else if (error?.status === 401) {
      errorMessage += 'Invalid API key. Please check your OpenAI API key in .env file.';
    } else if (error?.status === 429) {
      errorMessage += 'Rate limit exceeded. Please try again in a few minutes.';
    } else if (error?.status === 400) {
      errorMessage += 'Bad request. There may be an issue with the image format or prompt.';
    } else if (error?.message) {
      errorMessage += error.message;
    } else {
      errorMessage += 'Please try again.';
    }

    throw new Error(errorMessage);
  }
}

/**
 * Helper function to convert File to base64 data URL
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Build the AI prompt for image generation
 */
function buildPrompt(userDescription?: string): string {
  let prompt = AI_IMAGE_PROMPT_TEMPLATE;

  if (userDescription) {
    prompt += `\n\nCreature description: ${userDescription}`;
  }

  return prompt;
}

/**
 * Download an image URL and convert it to a File object
 * (Useful for saving the generated image to Supabase)
 */
export async function urlToFile(url: string, filename: string): Promise<File> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
}
