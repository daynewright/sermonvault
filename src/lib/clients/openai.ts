import OpenAI from 'openai';

// Create a singleton instance
let openaiInstance: OpenAI | null = null;

export function getOpenAIClient() {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
} 