/**
 * Shared OpenAI Client
 *
 * Initializes and exports the OpenAI client with server-side API key.
 * This ensures the API key is NEVER exposed to the browser.
 */

import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required on the server');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
