import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import LoadingDot from '../../../../components/Loading.js';
import { PrimaryColor } from '../../../../utils/constant.js';
import { handleCommand } from '../../../commands/commandHandler.js';
import { InteractionResponse, RetryChain } from '../../../../types/ai.js';
import { getAIResponse } from '../../getAiResponse.js';
import { execaCommand } from 'execa';
import { buildSystemPrompt } from '../../system/systemPrompt.js';
import { loadHistory, saveHistory } from '../../../../utils/history.js';
import { CommandOutput } from '../../../../types/cli.js';

interface DiagnosticStep {
  label: string;
  command: string;
  explanation: string;
}

interface StepResult {
  step: DiagnosticStep;
  output: string;
  success: boolean;
  error?: string;
}

export const DiagnosticResponse: React.FC<{
  response: InteractionResponse;
  onDone: () => void;
  onNext?: (r: InteractionResponse) => void;
  prompt: string | undefined;
}> = ({ response, onDone, onNext, prompt }) => {
  const [phase, setPhase] = useState<'confirm' | 'running' | 'analyzing' | 'completed'>('confirm');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [chain, setChain] = useState<RetryChain | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);

  const steps = response.steps ?? [];
  const explanation = response.content ?? 'These diagnostic steps may help identify the issue.';

  // Handle keyboard input for different phases
  useInput((input, key) => {
    if (isProcessing) return;

    switch (phase) {
      case 'confirm':
        if (input.toLowerCase() === 'y' || key.return) {
          setPhase('running');
        } else if (input.toLowerCase() === 'n' || key.escape) {
          onDone();
        }
        break;

      case 'completed':
        // Allow user to exit after completion
        if (key.escape || input.toLowerCase() === 'q') {
          onDone();
        }
        break;
    }
  });

  // Execute diagnostic steps sequentially
  useEffect(() => {
    if (phase !== 'running' || isProcessing || currentStepIndex >= steps.length) return;

    const executeStep = async () => {
      setIsProcessing(true);
      const step = steps[currentStepIndex];
      
      try {
        // const outcome = await handleCommand(prompt ?? '', step.command, chain);
        // setChain(outcome.chain);
        const { stdout, success } = await runShell(step.command);

        const stepResult: StepResult = {
          step,
          output: stdout ?? '(no output)',
          success: success
        };

        setStepResults(prev => [...prev, stepResult]);
      } catch (error) {
        const stepResult: StepResult = {
          step,
          output: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };

        setStepResults(prev => [...prev, stepResult]);
      } finally {
        setIsProcessing(false);
        setCurrentStepIndex(prev => prev + 1);
      }
    };

    executeStep();
  }, [phase, currentStepIndex, isProcessing, steps, prompt, chain]);

  // Check if all steps are completed and automatically send to analysis
  useEffect(() => {
    if (phase === 'running' && !isProcessing && currentStepIndex >= steps.length) {
      setPhase('analyzing');
      sendToMindShell();
    }
  }, [phase, isProcessing, currentStepIndex, steps.length]);

  // Send results to MindShell for analysis
  const sendToMindShell = async () => {
    if (!onNext) return;
  
    const diagnosticSummary = stepResults.map(result => 
      `🔍 ${result.step.label}\n` +
      `$ ${result.step.command}\n` +
      `${result.success ? '✅' : '❌'} ${result.success ? result.output : result.error}\n`
    ).join('\n');
  
    const promptToAI = 
      `Please analyze this diagnostic session:\n\n` +
      `📋 Original Issue:\n${prompt}\n\n` +
      `🔁 Retry Chain:\n${JSON.stringify(chain, null, 2)}\n\n` +
      `📊 Diagnostic Results:\n${diagnosticSummary}\n\n` +
      `Please provide summary and recommendations based on these diagnostic results keep it small and simple also include that our initial command and what we tried to resolved that with all diagnostic commands/steps etc in simplest way in content.
  1. Analyze and determine what kind of response is best:
     - "explanation": Just explain why it failed if no command is useful 
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
    try {
      setPhase("analyzing")
       const aiResponse = await getAIResponse(promptToAI, true);
       const resultObj: CommandOutput = {
                prompt: prompt??"",
                output: aiResponse.content,
                type: 'explanation',
                error: '',
                timestamp: new Date()
              };
              saveHistory([...loadHistory() , resultObj])  
      onNext(aiResponse);
      onDone();
    } catch (error) {
      // fallback: send plain text if AI call fails
      onNext({
        type: 'conversation',
        content: `Failed to get AI analysis: ${error instanceof Error ? error.message : String(error)}\n\n` + promptToAI,
        confidence: 5,
      });
    }
  };
  

  // Render step list with status indicators
  const renderStepsList = () => (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="gray">Diagnostic Steps:</Text>
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isRunning = index === currentStepIndex && isProcessing;
        const result = stepResults[index];
        
        return (
          <Box key={index} flexDirection="column" marginLeft={1} marginTop={1} marginBottom={1}>
            <Box>
              <Text color={isCompleted ? (result?.success ? 'green' : 'red') : isRunning ? 'yellow' : 'gray'}>
                {isCompleted ? (result?.success ? '✅ ' : '❌ ') : isRunning ? '⏳ ' : '⏸️ '}
              </Text>
              <Text color={isCompleted ? 'white' : 'gray'}> { step.label}</Text>
            </Box>
            <Text color={PrimaryColor} bold>
              $ {step.command}
            </Text>
          </Box>
        );
      })}
    </Box>
  );

  // Render step results
//   const renderStepResults = () => (
//     <Box flexDirection="column" marginTop={0}>
//       <Text color="greenBright">📋 Execution Results:</Text>
//       {stepResults.map((result, index) => (
//         <Box key={index} flexDirection="column" marginTop={1} marginLeft={1} marginBottom={1}>
          
//           <Text color="gray" >
//             $ {result.step.command}
//           </Text>
//           <Box marginLeft={0} borderLeft borderColor="gray" paddingLeft={1}>
//             <Text wrap="wrap" color={result.success ? 'white' : 'red'}>
//               {result.success ? result.output : result.error}
//             </Text>
//           </Box>
//         </Box>
//       ))}
//     </Box>
//   );

  return (
    <Box flexDirection="column" padding={1} borderStyle="single" borderColor="gray">
      <Box marginBottom={1}>
        <Text color="yellow">
          <Text color="gray">Explanation:</Text> {explanation}
        </Text>
      </Box>

      {renderStepsList()}

      {phase === 'confirm' && (
        <Box flexDirection="column" marginTop={0}>
          <Text color="white">
            Run these {steps.length} diagnostic steps?  Y/N
          </Text>
        </Box>
      )}

      {phase === 'running' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="yellow">
            Executing diagnostic steps... ({currentStepIndex + 1}/{steps.length})
          </Text>
         
        </Box>
      )}

       {isProcessing && (
            <LoadingDot text={`Running: ${steps[currentStepIndex]?.label}`} />
          )}
      
      {stepResults.length > 0}
      {phase === 'analyzing' && (
        <Box flexDirection="column" marginTop={1} borderTop borderColor="gray" paddingTop={1}>
          <LoadingDot text="Analyzing error with these outputs" />
        </Box>
      )}

      {phase === 'completed' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="green">
            ✅ Diagnostic session completed successfully!
          </Text>
          <Text color="gray" dimColor>
            Press 'q' or ESC to exit
          </Text>
        </Box>
      )}
    </Box>
  );
};

export async function runShell(command: string): Promise<{ stdout: string; success: boolean }> {
    try {
      const { stdout } = await execaCommand(command, { shell: true });
      return { stdout, success: true };
    } catch (error: any) {
      return { stdout: error.stderr || error.message, success: false };
    }
  }