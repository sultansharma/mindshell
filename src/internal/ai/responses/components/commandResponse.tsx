import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import LoadingDot from '../../../../components/Loading.js';
import { PrimaryColor } from '../../../../utils/constant.js';
import { handleCommand } from '../../../commands/commandHandler.js';
import { InteractionResponse, RetryChain } from '../../../../types/ai.js';
import TextInput from 'ink-text-input';

// ——— Utils ———————————————————————————————————
function extractPlaceholders(cmd: string): string[] {
  const re = /<([^>]+)>/g;
  const seen = new Set<string>();
  const matches = [...cmd.matchAll(re)].map(m => m[1]);

  return matches.filter(label => {
    if (seen.has(label)) return false;
    seen.add(label);
    return true;
  });
}

function replacePlaceholders(cmd: string, values: Record<string, string>) {
  let result = cmd;
  for (const [key, value] of Object.entries(values)) {
    const placeholder = `<${key}>`;
    result = result.split(placeholder).join(value);
  }
  return result;
}

// ——— Main Component ———————————————————————————————
export const CommandResponse: React.FC<{
  response: InteractionResponse;
  onDone: () => void;
  onNext?: (r: InteractionResponse) => void;
  prompt: string | undefined;
}> = ({ response, onDone, onNext, prompt }) => {
  const [currentCmd, setCurrentCmd] = useState<string>(response.command ?? '');
  const [aiExplanation, setAiExplanation] = useState<string | null>(response.content ?? null);
  const [chain, setChain] = useState<RetryChain | undefined>(undefined);
  const [placeholdersResolved, setPlaceholdersResolved] = useState(false);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState<number>(0);
  const [inputBuffer, setInputBuffer] = useState<string>('');

  const [confirmNeeded, setConfirmNeeded] = useState<boolean>(true);
  const [isRunning, setRunning] = useState<boolean>(false);
  const [lastOutput, setLastOutput] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // ——— Detect placeholders when command changes —————————————
  useEffect(() => {
    const extracted = extractPlaceholders(currentCmd);
    if (extracted.length > 0) {
      setPlaceholders(extracted);
      setConfirmNeeded(false); // Start filling placeholders immediately
    }
  }, [currentCmd]);

  // ——— Handle User Input ———————————————————————————————
  useInput((input, key) => {
    if (isRunning) return;
  
    if (confirmNeeded && (input.toLowerCase() === 'y' || key.return)) {
      setConfirmNeeded(false); // This triggers `useEffect` if placeholdersResolved is true
    } else if (confirmNeeded && (input.toLowerCase() === 'n' || key.escape)) {
      onDone();
    }
  });
  useEffect(() => {
    if (!placeholdersResolved || confirmNeeded || isRunning) return;
  
    (async () => {
      setRunning(true);
      const outcome = await handleCommand(prompt ?? '', currentCmd, chain);
      setChain(outcome.chain);
      setRunning(false);
  
      if (outcome.done) {
        setLastOutput(outcome.nextResponse.content ?? '');
        onDone();
        return;
      }
  
      if (onNext) {
        onNext(outcome.nextResponse);
      } else {
        const nextCmd = outcome.nextResponse.command ?? '';
        setCurrentCmd(nextCmd);
        setAiExplanation(outcome.nextResponse.content ?? '');
        setPlaceholdersResolved(false); // restart for next
        setPlaceholderValues({});
        setCurrentPlaceholderIndex(0);
        setConfirmNeeded(false);
      }
    })();
  }, [placeholdersResolved, confirmNeeded, isRunning]);
  
  // ——— Run command when ready ————————————————————————
  // useEffect(() => {
  //   if (confirmNeeded || isRunning || placeholders.length > 0 && currentPlaceholderIndex < placeholders.length)
  //     return;

  //   (async () => {
  //     setRunning(true);
  //     const outcome = await handleCommand(prompt ?? '', currentCmd, chain);
  //     setChain(outcome.chain);
  //     setRunning(false);

  //     if (outcome.done) {
  //       setLastOutput(outcome.nextResponse.content ?? '');
  //       onDone();
  //       return;
  //     }

  //     // Not done, pass to next step
  //     if (onNext) {
  //       onNext(outcome.nextResponse);
  //     } else {
  //       const nextCmd = outcome.nextResponse.command ?? '';
  //       setCurrentCmd(nextCmd);
  //       setAiExplanation(outcome.nextResponse.content ?? '');
  //       setConfirmNeeded(true);
  //     }
  //   })();
  // }, [confirmNeeded, isRunning]);

  // ——— UI —————————————————————————————————————————————
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

      {/* Placeholder prompt */}
      {!confirmNeeded && placeholders.length > 0 && currentPlaceholderIndex < placeholders.length && (
        <Box marginTop={1} flexDirection="column">
          <Text>
            📝 Please enter value for <Text bold color="cyan">{placeholders[currentPlaceholderIndex]}</Text>:
          </Text>
          <Box
            borderStyle="round"
            borderColor={'#FFA500'}
            paddingX={1}
            paddingY={0}
            //width={100}
            flexGrow={1}
          >
          <TextInput
              key="placeholder"
              value={inputBuffer}
              onChange={(val)=>{setInputBuffer(val)}}
              onSubmit={(value) => {
                const label = placeholders[currentPlaceholderIndex];
                const updatedValues = {
                  ...placeholderValues,
                  [label]: value.trim()
                };  
                setPlaceholderValues(updatedValues);
                setInputBuffer('');
            
                if (currentPlaceholderIndex + 1 < placeholders.length) {
                  setCurrentPlaceholderIndex((i) => i + 1);
                } else {
                  const finalCmd = replacePlaceholders(currentCmd, updatedValues);
                  setCurrentCmd(finalCmd);
                  setPlaceholdersResolved(true); // ✅ All placeholders done
                  setConfirmNeeded(true);
                }
              }}
              placeholder="Please provide value"
              showCursor
            />
            </Box>
        </Box>
      )}

      {/* Confirmation */}
      {confirmNeeded && !isRunning && (
        <Text>Run this command? (y/n)</Text>
      )}

      {/* Running indicator */}
      {isRunning && <LoadingDot text="Executing command" />}

      {/* Errors */}
      {lastError && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="red">❌ Error:</Text>
          <Text wrap="wrap">{lastError}</Text>
        </Box>
      )}

      {/* Output */}
      {lastOutput && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="greenBright">📋 Output:</Text>
          <Text wrap="wrap">{lastOutput}</Text>
        </Box>
      )}
    </Box>
  );
};