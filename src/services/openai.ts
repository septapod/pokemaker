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

if (!apiKey) {
  console.error('Missing OpenAI API key. Please check your .env file.');
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

  } catch (error) {
    console.error('Error generating Pokémon image:', error);
    throw error;
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
              text: `Analyze this Pokémon drawing and describe what you see.
              Focus on: body shape, features, colors, type (fire/water/grass etc),
              personality/mood, and any unique characteristics.
              ${userDescription ? `The creator says: "${userDescription}"` : ''}
              Provide a detailed description for creating a professional Pokémon illustration.`
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

    const finalPrompt = `${AI_IMAGE_PROMPT_TEMPLATE}

Based on this description, create a Pokémon:
${aiAnalysis}`;

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

  } catch (error) {
    console.error('Error generating Pokémon image with vision:', error);
    throw error;
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
