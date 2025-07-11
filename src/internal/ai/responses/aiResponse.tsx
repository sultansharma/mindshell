import { InteractionResponse } from '../../../types/ai.js';
import { CommandResponse } from './components/commandResponse.js';
import { Box, useApp, useInput,Text } from "ink";
import { DiagnosticResponse } from './components/diagnosticResponse.js';
import { ExplanationResponse } from './components/explainResponse.js';
// type AIResponse = 
//   | { type: 'command'; content: string; command: string; explanation?: string; confidence: number }
//   | { type: 'multi_step'; steps: Step[]; explanation: string; confidence: number }
//   | { type: 'explanation'; content: string; confidence: number }
//   | { type: 'answer'; content: string; confidence: number }
//   | { type: 'conversation'; content: string; confidence: number }

// type Step = {
//   command: string;
//   description: string;
//   safe: boolean;
//   requires_confirmation: boolean;
// }

export function AIResponseRenderer(response:InteractionResponse, onDone: () => void ,
onNext?: (r: InteractionResponse) => void,  // 👈 add this
prompt?: string) {
  switch (response.type) {
    case 'command':
      return <CommandResponse response={response} onDone={onDone} onNext={onNext} prompt={prompt} />;
    case 'diagnostic':
      return <DiagnosticResponse response={response} onDone={onDone} onNext={onNext} prompt={prompt} />;
  
    // case 'multi_step':
    //   return <MultiStepResponse response={response} />;
    case 'explanation':
      return <ExplanationResponse  response={response} onDone={onDone} onNext={onNext} prompt={prompt} />;
    // case 'answer':
    //   return <AnswerResponse content={response.content} />;
    // case 'conversation':
    //   return <ConversationResponse content={response.content} />;
    default:
      return <Text>AI Response: {response.type} {response.command} {(response as any).content ?? 'Unknown response'}</Text>;
  }
}