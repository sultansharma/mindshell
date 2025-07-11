// openai.ts
import OpenAI from 'openai';

import { InteractionResponse } from '../../../types/ai.js';
import { buildSystemPrompt } from '../system/systemPrompt.js'; // if you use it
import { parseAIResponse } from '../parser.js';

/**
 * Generate a response with OpenAI Chat models.
 *
 * @param prompt       The user‑supplied prompt.
 * @param systemPrompt A system‑level instruction (use buildSystemPrompt(...) if you like).
 * @param modelID      e.g. "gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo".
 * @param apiKey       Your OpenAI API key.
 */
export async function generateWithOpenAI(
  prompt: string,
  systemPrompt: string,
  modelID: string,
  apiKey: string
): Promise<InteractionResponse> {
  if (!apiKey) {
    throw new Error('OpenAI API key is not set');
  }

  // Initialise the SDK (npm install openai)
  const openai = new OpenAI({ apiKey });

  // Call the chat completion endpoint
  const response = await openai.chat.completions.create({
    model: modelID,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ]
    // You can add temperature, max_tokens, etc. here if needed
  });

  const text =
    response.choices?.[0]?.message?.content ??
    'No response from OpenAI';

  // Reuse your existing post‑processor to normalise shape
  return parseAIResponse(text);
}
