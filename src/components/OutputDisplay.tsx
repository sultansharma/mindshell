import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { CommandOutput } from '../types/cli.js';
import { PrimaryColor } from '../utils/constant.js';
import { loadConfig } from '../utils/config.js';

interface OutputDisplayProps {
  outputs: CommandOutput[];
  isExecuting: boolean;
}

export const OutputDisplay: React.FC<OutputDisplayProps> = ({ 
  outputs, 
  isExecuting 
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const latestConfig = loadConfig();
  const isShellMode = latestConfig?.isShellModeActive ?? false;

  useInput((input, key) => {
    if (key.downArrow) {
      setSelectedIndex(prev => {
        if (outputs.length === 0) return null;
        const next = prev === null ? 0 : Math.min(prev + 1, outputs.length - 1);
        return next;
      });
    }
    if (key.upArrow) {
      setSelectedIndex(prev => {
        if (outputs.length === 0) return null;
        const next = prev === null ? outputs.length - 1 : Math.max(prev - 1, 0);
        return next;
      });
    }

    if (key.return && selectedIndex !== null) {
      // Example: You can trigger something with the selected item
      console.log('Selected item:', outputs[selectedIndex]);
    }
  });

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatOutput = (output: CommandOutput, index: number) => {
    const { command, output: result, error, timestamp, exitCode,prompt,type } = output;
    const isSelected = selectedIndex === index;

    return (
      <Box 
        key={`${command}-${timestamp.getTime()}`} 
        flexDirection="column" 
        marginBottom={0}
        paddingRight={2}
        paddingLeft={1}
        borderStyle="round" 
        borderColor="gray"
      >
       <Box width={100} flexDirection='column'>
            <Box flexDirection='row'>
            <Text color="white" bold><Text bold={false} color="gray">{formatTimestamp(timestamp)}</Text><Text color="yellow"> $</Text> {prompt}</Text>
            </Box>
            {type == "command" &&
               <Box  flexDirection="column" marginTop={1} paddingRight={2} alignItems="flex-start" alignSelf='flex-start'>
               <Text color="gray">Command:</Text>
               <Box
                // width={70}
                 paddingX={1}
                 borderStyle="classic"
                 borderColor="gray"
               >
                 <Text color={PrimaryColor} bold>{command}</Text>
               </Box>
             </Box> }
            {exitCode !== undefined && exitCode !== 0 && (
              <Text color="red"> (exit code: {exitCode})</Text>
            )}
       </Box>
        {result && (
          <Box>
            <Text color={error ? "red" : command === 'welcome' ? "green" : "white"}>
              {result}
            </Text>
          </Box>
        )}
         {error && (
                <Box flexDirection="column" marginTop={1}>
                  <Text color="red">❌ Error:</Text>
                  <Text wrap="wrap">{error}</Text>
                </Box>
              )}
        
      </Box>
    );
  };

  return (
    <Box flexDirection="column" flexGrow={1}>
      {outputs.length === 0 && !isExecuting && (
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text color="gray" italic>No output yet. Type a command to get started!</Text>
        </Box>
      )}


      {outputs.map((output, i) => formatOutput(output, i))}
      
      {isExecuting && (
        <Box alignItems="center" marginTop={1}>
          <Text color="blue">
            <Spinner type="dots"/>
          </Text>
          <Text color="blue" > {isShellMode ? ` Executing command...` : ` I am thinking...`}</Text>
        </Box>
      )}
    </Box>
  );
};
