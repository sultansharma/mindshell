// src/ai/getAIResponse.ts

import { toSimpleContext } from './contextAdapter.js';
import { generateWithGemini } from './providers/gemini.js';
import { parseAIResponse } from './parser.js';
import { InteractionResponse } from '../../types/ai.js';
import { isValidConfig, loadConfig } from '../../utils/config.js';
import { getContextForCLI } from './system/contextDetector.js';
import { buildSystemPrompt } from './system/systemPrompt.js';
import { debugLog, generateWithOllama } from './providers/ollma.js';
import { generateWithOpenAI } from './providers/openai.js';

export async function getAIResponse(prompt: string , error?:boolean ): Promise<InteractionResponse> {
  // 1. Load config
  const config = loadConfig();
  if (!config || !isValidConfig(config)) throw new Error('Invalid or missing config');

  const model = config.model!;
  const provider = model.split(':')[0];
  const modelID = model.split(':')[1] || model;
  const apiKey = config.APIKeys?.[provider] || '';

  // 2. Get context
  const { full, compact, timing } = await getContextForCLI();
  console.log(`🧠 Context: ${compact}`);
  console.log(`⚡ Loaded in ${timing.total}ms (cached: ${timing.cached})`);


  const context = toSimpleContext(full);
  const systemPrompt = error ? prompt : buildSystemPrompt(context);
 // const systemPrompt = buildSystemPrompt(context);
  // 3. Run model
  let raw: any;

  switch (provider) {
    case 'gemini':
      raw = await generateWithGemini( error ? ' ': prompt, systemPrompt, modelID, apiKey);
      break;
    case 'ollama':
      raw = await generateWithOllama(prompt, context, modelID);
      break;
    case 'openai':
        raw = await generateWithOpenAI(prompt,systemPrompt, modelID,apiKey);
        break;

    default:
      throw new Error(`Unsupported model provider: ${provider}`);
  }
  // 4. Parse and return
 // debugLog(raw)
  const parsed = parseAIResponse(raw);
  //debugLog(parsed)
  return parsed;
}
