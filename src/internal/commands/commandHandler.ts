// commands/commandHandler.ts

import { CommandExecutor } from './executor.js';
import { getAIResponse } from '../ai/getAiResponse.js';
import { loadHistory, saveHistory } from '../../utils/history.js';
import { InteractionResponse, RetryChain } from '../../types/ai.js';
import { v4 as uuidv4 } from 'uuid';
import { buildSystemPrompt } from '../ai/system/systemPrompt.js';
import { error } from 'console';
const executor = new CommandExecutor();

export type CmdOutcome = {
  done: boolean;
  nextResponse: InteractionResponse;
  chain: RetryChain;
};

export async function handleCommand(
  prompt: string,
  cmd: string,
  chain?: RetryChain
): Promise<CmdOutcome> {
  // 1. Create or extend retry chain
  if (!chain) {
    chain = {
      id: uuidv4(),
      startedAt: new Date(),
      attempts: [{ origin: 'user', prompt, command: cmd }]
    };
  } else {
    chain.attempts.push({ origin: 'user', prompt, command: cmd });
  }

  // 2. Run command
  const runRes = await executor.executeCommand(cmd);
  const current = chain.attempts[chain.attempts.length - 1];
  current.output = runRes.output;
  current.error  = runRes.error;

  // 3. Save to history
  saveHistory([
    ...loadHistory(),
    {
      prompt,
      command: cmd,
      output: runRes.output,
      error: runRes.error,
      timestamp: new Date(),
      type: 'command'
    }
  ]);

  if (!runRes.error) {
    // ✅ Success: return original command response
    const successResponse: InteractionResponse = {
      type: 'command',
      content: runRes.output ?? '',
      command: cmd,
      confidence: 9
    };

    return {
      done: true,
      nextResponse: successResponse,
      chain
    };
  }

  // ⛔ Failure: build recovery prompt and ask AI
  const recoveryPrompt = buildSmartRecoveryPrompt(chain);
  const aiRetry = await getAIResponse(recoveryPrompt,true);

  chain.attempts.push({
    origin: 'ai',
    prompt,
    command: aiRetry.command ?? '',
    output: aiRetry.content,
    error: undefined
  });

  return {
    done: false,
    nextResponse: aiRetry,
    chain
  };
}
export function buildSmartRecoveryPrompt(chain: RetryChain, context: Record<string, string> = {}): string {
    const last = chain.attempts[chain.attempts.length - 1];
    const basePrompt = buildSystemPrompt(context);
  
    const recoveryPrompt = `
  --- SMART ERROR RECOVERY MODE ---
  
  The previous command failed.
  
  Command:
  \`\`\`
  ${last.command}
  \`\`\`
  
  Error:
  \`\`\`
  ${last.error ?? "No error info"}
  \`\`\`
  
  Attempt history:
  ${chain.attempts
    .map((a, i) => {
      return `Attempt ${i + 1}:
  - Origin: ${a.origin}
  - Prompt: ${a.prompt}
  - Command: ${a.command}
  - Output: ${a.output ?? "none"}
  - Error: ${a.error ?? "none"}`;
    })
    .join("\n\n")}
  
  YOUR JOB:
  
  1. Analyze the error and determine what kind of response is best:
     - "command": Suggest one shell command to fix the issue
     - "diagnostic": Provide 2–5 safe diagnostic steps to investigate
     - "explanation": Just explain why it failed if no command is useful
     - "conversation": If the error is not technical, respond politely
  
  2. Respond in a consistent JSON format (see below)
  
  RESPONSE FORMAT (Always valid JSON):
  {
    "type": "command | diagnostic | explanation | conversation",
    "content": "Main explanation or response",
    "command": "Only if type is command",
    "explanation": "Optional explanation for command",
    "confidence": 1–10,
    "steps": [
      {
        "label": "What this step checks",
        "command": "Shell command",
        "explanation": "Why this step helps",
        "safe": true
      }
    ],
    "final_command": "Optional final shell command",
    "final_safe": true
  }
  Only include 'steps', 'final_command', and 'final_safe' if type === "diagnostic".
  `;
  
    return basePrompt + recoveryPrompt;
  }
  

// export function buildSystemPromptWithError(chain: RetryChain): string {
//     const last = chain.attempts[chain.attempts.length - 1];
  
//     const errorSection = `
//   --- ERROR RECOVERY MODE ---
//   The previous command failed:
//   Command: ${last.command}
//   Error:
//   ${last.error ?? "No error info"}
  
//   Full history of attempts:
//   ${chain.attempts
//     .map((a, i) => {
//       return `
//   Attempt ${i + 1}:
//   - Origin: ${a.origin}
//   - Prompt: ${a.prompt}
//   - Command: ${a.command}
//   - Output: ${a.output ?? "none"}
//   - Error: ${a.error ?? "none"}`.trim();
//     })
//     .join("\n\n")}
  
//   Instructions for you:
//   1. Explain clearly why the last command likely failed, based on the error.
//   2. Suggest one or more alternative shell commands or strategies to solve the problem.
//      - For example, if a file is not found, suggest searching parent directories, locating the file, or verifying path correctness.
//   3. If appropriate, provide safe troubleshooting steps or common pitfalls.
//     Only respond with the JSON object, no extra text outside it.
//   `;
  
//     return errorSection;
//   }
  
