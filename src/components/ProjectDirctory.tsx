import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import path from 'path';
import fs from 'fs';
import { Config } from '../types/config.js';
import { PrimaryColor } from '../utils/constant.js';
import { WelcomeBanner } from './welcome.js';

export interface VerifyProjectDirProps {
  projectRoot: string;
  setProjectRoot: (path: string) => void;
  onConfirmed: () => void;
  onReject: () => void;
  config: Config | null;
  setConfig: (cfg: Config) => void;
  apiKeyInput: string;
  selectedModelIndex: number | null;
}

export const VerifyProjectDir: React.FC<VerifyProjectDirProps> = ({
  projectRoot,
  setProjectRoot,
  onConfirmed,
  onReject
}) => {
  const [confirmationStep, setConfirmationStep] = useState(true);

  const mindshellPath = path.join(projectRoot, '.mindshell');
  const configPath = path.join(mindshellPath, 'config.json');

  useInput((input, key) => {
    if (!confirmationStep) return;

    if (input.toLowerCase() === 'y') {
      const success = createMindshellConfig();
      if (success) onConfirmed();
    }

    if (input.toLowerCase() === 'n') {
      onReject();
    }
  });

  const createMindshellConfig = () => {
    try {
      // Ensure .mindshell directory exists
      if (!fs.existsSync(mindshellPath)) {
        fs.mkdirSync(mindshellPath, { recursive: true });
      }

      // Save ONLY projectRoot in config.json
      const newConfig = { projectRoot };
      fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
      return true;
    } catch (error) {
      console.error('Error writing project config:', error);
      return false;
    }
  };

  return (
    <Box flexDirection="column" marginX={2}>
      <WelcomeBanner />

      <Box flexGrow={1} marginTop={4} flexDirection="column" alignItems="flex-start">
      <Box marginTop={0} flexDirection='row'>
         <Text> Project root:</Text>
        <Text color="gray">(We will save history, config, etc. to this folder under `.mindshell/`)
        </Text>
      </Box>
       
        <Box width={100} flexDirection="row" alignItems="center">
         
          <Box
            marginLeft={0}
            marginRight={2}
            flexGrow={2}
            paddingX={1}
            borderStyle="round"
            borderColor="gray"
          >
            <Text color={PrimaryColor} bold>{projectRoot}</Text>
          </Box>
        </Box>
      </Box>

      <Box>
        <Text color="white"> Is this your project root directory? (y/n):</Text>
      </Box>
     
    </Box>
  );
};
