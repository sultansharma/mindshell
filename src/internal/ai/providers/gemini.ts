// gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

import { InteractionResponse } from '../../../types/ai.js';
import { buildSystemPrompt } from '../system/systemPrompt.js';
import { parseAIResponse } from '../parser.js';

export async function generateWithGemini(
  prompt: string,
  systemPrompt: string,
  modelID: string,
  apiKey: string
): Promise<InteractionResponse> {
  if (!apiKey) {
    throw new Error('Gemini API key is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelID });

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: prompt }
  ]);

  const text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini';

  return parseAIResponse(text);
}
