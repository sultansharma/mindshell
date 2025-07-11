export interface InteractionResponse {
  type: 'command' | 'explanation' | 'diagnostic' | 'answer' | 'conversation';
  content: string;

  // For single-command response (type: 'command')
  command?: string;
  explanation?: string;
  safe?: boolean; // true = no confirmation needed

  // For multi-step diagnostics (type: 'diagnostic')
  steps?: {
    label: string;
    command: string;
    explanation: string;
    safe: boolean;
  }[];

  final_command?: string;
  final_safe?: boolean;

  // Confidence score (1–10)
  confidence?: number;

  // Optional full raw output from the LLM
  llm_output?: string;
}


type Attempt = {
  origin: 'user' | 'ai';
  prompt: string;
  command: string;
  error?: string;
  output?: string;
};

export type RetryChain = {
  id: string;
  attempts: Attempt[];
  startedAt: Date;
};