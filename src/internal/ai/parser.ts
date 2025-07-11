import { InteractionResponse } from '../../types/ai.js';

export function parseAIResponse(content: string): InteractionResponse {
  if (typeof content !== 'string') {
    // If it's not a string, convert to string or fallback
    content = typeof content === 'object' && content !== null ? JSON.stringify(content) : String(content);
  }
  let clean = content.trim();

  // Remove markdown code blocks if present
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  }

  try {
    const parsed = JSON.parse(clean);

    if (typeof parsed === 'object' && parsed !== null) {
      const response: InteractionResponse = {
        type: typeof parsed.type === 'string' ? parsed.type : 'explanation',
        content: typeof parsed.content === 'string' ? parsed.content : clean,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 5,
        // Optional fields
        command: typeof parsed.command === 'string' ? parsed.command : undefined,
        explanation: typeof parsed.explanation === 'string' ? parsed.explanation : undefined,
        llm_output: typeof parsed.llm_output === 'string' ? parsed.llm_output : undefined,
        final_command: typeof parsed.final_command === 'string' ? parsed.final_command : undefined,
        final_safe: typeof parsed.final_safe === 'boolean' ? parsed.final_safe : undefined,
        safe: typeof parsed.safe === 'boolean' ? parsed.safe : undefined,
        steps: Array.isArray(parsed.steps) ? parsed.steps.map((step: any) => ({
          label: typeof step.label === 'string' ? step.label : '',
          command: typeof step.command === 'string' ? step.command : '',
          explanation: typeof step.explanation === 'string' ? step.explanation : '',
          safe: typeof step.safe === 'boolean' ? step.safe : false,
        })) : undefined,
      };

      return response;
    }
  } catch {
    // JSON parsing failed, ignore and fallback
  }

  return {
    type: 'conversation',
    content: clean,
    confidence: 5,
  };
}

function looksLikeCommand(content: string): boolean {
  const known = [
    'ls', 'cd', 'mkdir', 'rm', 'cp', 'mv', 'grep', 'find',
    'git', 'npm', 'pip', 'docker', 'curl', 'wget', 'chmod',
    'sudo', 'go', 'cargo', 'brew', 'apt', 'yum', 'pwd',
    'cat', 'head', 'tail', 'sort', 'uniq', 'wc', 'echo'
  ];
  const trimmed = content.trim();
  return known.some(cmd => trimmed === cmd || trimmed.startsWith(cmd + ' '));
}

function looksLikeQuestion(content: string): boolean {
  const questionWords = ['what', 'how', 'why', 'when', 'where', 'which', 'who'];
  const lowerContent = content.toLowerCase();
  return questionWords.some(word => lowerContent.includes(word + ' ')) || 
         lowerContent.includes('?') ||
         lowerContent.startsWith('explain') ||
         lowerContent.startsWith('describe') ||
         lowerContent.startsWith('tell me');
}
