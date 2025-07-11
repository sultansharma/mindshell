
import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import LoadingDot from '../../../../components/Loading.js';
import { PrimaryColor } from '../../../../utils/constant.js';
import { handleCommand } from '../../../commands/commandHandler.js';
import { InteractionResponse, RetryChain } from '../../../../types/ai.js';


export const CommandResponse: React.FC<{ response: InteractionResponse; onDone: () => void;  onNext?: (r: InteractionResponse) => void; prompt: string | undefined }> = ({
  response,
  onDone,
  onNext,
  prompt
}) => {
  // —— local state ——————————————————————————————
  const [currentCmd, setCurrentCmd] = useState<string>(response.command??'');
  const [aiExplanation, setAiExplanation] = useState<string | null>(response.content ?? null);
  const [chain, setChain] = useState<RetryChain | undefined>(undefined);

  const [confirmNeeded, setConfirmNeeded] = useState(true);  // need y/n?
  const [isRunning, setRunning] = useState(false);
  const [lastOutput, setLastOutput] = useState<string | null>(null);
  const [lastError, setLastError]   = useState<string | null>(null);

  // —— key handler ———————————————————————————————
  useInput((input, key) => {
    if (isRunning) return;

    if (confirmNeeded && (input.toLowerCase() === 'y' || key.return)) {
      setConfirmNeeded(false);  // lock input until run finishes
    } else if (confirmNeeded && (input.toLowerCase() === 'n' || key.escape)) {
      onDone();
    }
  });

  // —— run whenever confirmNeeded flips to false ——-
  useEffect(() => {
    if (confirmNeeded || isRunning) return;
  
    (async () => {
      setRunning(true);
      const outcome = await handleCommand(prompt ?? '', currentCmd, chain);
      setChain(outcome.chain);
      setRunning(false);
  
      if (outcome.done) {
        // success – show output & exit
        setLastOutput(outcome.nextResponse.content ?? '');
        onDone();
        return;
      }
  
      // Not done – we got a retry InteractionResponse
      if (onNext) {
        onNext(outcome.nextResponse);   // 🔁 hand new response to parent (CLIShell)
      } else {
        // Fallback: stay in this component and display suggestion
        const nextCmd = outcome.nextResponse.command ?? '';
        setCurrentCmd(nextCmd);
        setAiExplanation(outcome.nextResponse.content ?? '');
        setConfirmNeeded(true);
      }
    })();
  }, [confirmNeeded]);
  
  // —— UI ——————————————————————————————
  return (
    <Box flexDirection="column" padding={1} borderStyle="single" borderColor="gray">
      {aiExplanation && (
        <Text color="yellow">
          <Text color="gray">Explanation:</Text> {aiExplanation}
        </Text>
      )}

      <Text>{response.type}</Text>

      <Box marginTop={1} flexDirection="column">
        <Text color="gray">Command:</Text>
        <Box paddingX={1} borderStyle="classic" borderColor="gray">
          <Text color={PrimaryColor} bold>{currentCmd}</Text>
        </Box>
      </Box>

      {confirmNeeded && !isRunning && (
        <Text>Run this command? (y/n)</Text>
      )}

      {isRunning && <LoadingDot text="Executing command" />}

      {lastError && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="red">❌ Error:</Text>
          <Text wrap="wrap">{lastError}</Text>
        </Box>
      )}

      {lastOutput && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="greenBright">📋 Output:</Text>
          <Text wrap="wrap">{lastOutput}</Text>
        </Box>
      )}
    </Box>
  );
};
