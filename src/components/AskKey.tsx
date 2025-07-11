import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { Config } from '../types/config.js';

interface EnterApiKeyProps {
  selectedModel: { label: string; model: string };
  apiKey: string;
  setApiKey: (value: string) => void;
  onSubmit: (config: Config) => void;
}

export const EnterApiKey: React.FC<EnterApiKeyProps> = ({
  selectedModel,
  apiKey,
  setApiKey,
  onSubmit
}) => {
  const provider = selectedModel.model.split(':')[0];

  return (
    <Box flexDirection="column">
      <Text>🔑 Enter API key for {provider}:</Text>
      <Box marginTop={1}>
        <TextInput
          value={apiKey}
          onChange={setApiKey}
          onSubmit={() => {
            const newCfg: Config = {
              model: selectedModel.model,
              APIKeys: {
                [provider]: apiKey.trim()
              }
            };
            onSubmit(newCfg);
          }}
        />
      </Box>
    </Box>
  );
};
