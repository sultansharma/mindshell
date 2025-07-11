import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import fs from 'fs';
import path from 'path';
import { PrimaryColor } from '../utils/constant.js';
import { WelcomeBanner } from './welcome.js';

interface SetProjectDirManualProps {
  projectRoot: string;
  setProjectRoot: (path: string) => void;
  onValid: () => void;
}

export const SetProjectDirManual: React.FC<SetProjectDirManualProps> = ({
  projectRoot,
  setProjectRoot,
  onValid
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleChange = (input: string) => {
    setProjectRoot(input);
    if (!fs.existsSync(input)) {
      setErrorMsg('❌ Directory does not exist');
    } else {
      setErrorMsg(null);
    }
  };

  const handleSubmit = () => {
    if (!fs.existsSync(projectRoot)) {
      setErrorMsg('❌ Directory does not exist. Please enter a valid path.');
      return;
    }
    setErrorMsg(null);
    onValid();
  };

  return (
    <Box flexDirection="column" marginX={2}>
      
      <WelcomeBanner />
      <Box marginTop={4} flexDirection="column">
       <Box flexDirection='row' alignItems='flex-end' justifyContent='space-between'>
       <Text >📁 Enter the full path for your project root:</Text>    
       {errorMsg && (
          <Text color="red">{errorMsg} </Text>
      )}
       </Box>
     
      <Box
             borderStyle="round"
             borderColor={errorMsg !=null ? 'redBright' :  PrimaryColor}
             paddingX={1}
             paddingY={0}
             
             //width={100}
             flexGrow={1}
           >
        <TextInput
          value={projectRoot}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />

      </Box>
      </Box>

      {/* Project path preview box */}
      {/* <Box
        marginTop={1}
        paddingX={1}
        borderStyle="round"
        borderColor={PrimaryColor}
        flexDirection="column"
      >
        <Text color={PrimaryColor}>📂 Path Preview:</Text>
        <Text color="cyan" bold>{projectRoot}</Text>
      </Box> */}

      {/* Error message */}
      
    </Box>
  );
};
