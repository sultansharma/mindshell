// components/WelcomeBanner.tsx
import React, { useState, useEffect } from 'react';
import figlet from 'figlet';
import { Box, Text } from 'ink';
import { PrimaryColor } from '../utils/constant.js';

export const WelcomeBanner: React.FC = () => {
  const [bannerText, setBannerText] = useState<string>('MINDSHELL');

  useEffect(() => {
    figlet.text(
      'MINDSHELL',
      {
        font: 'Small', // Try "Standard", "Slant", "Small", "ANSI Shadow", etc.
        horizontalLayout: 'default',
        verticalLayout: 'default'
      },
      (err, data) => {
        if (!err && data) {
          setBannerText(data);
        }
      }
    );
  }, []);

  return (
    <Box flexDirection="column" marginBottom={1} borderStyle={'round'} borderColor={PrimaryColor}>
      <Text color={PrimaryColor}>{bannerText}</Text>
      <Box flexDirection="column" marginTop={1} marginBottom={1} width={100}>
        <Text color="gray">💬 Ask anything (type 'exit' or 'quit' to leave)</Text>
        <Text color="gray">🚀 Run direct commands with <Text bold>run &lt;command&gt;</Text></Text>
        <Text color="gray">📦 MindShell v0.1 — A simple, fast & intelligent CLI assistant</Text>
        <Text color="gray">🧠 Type <Text bold color={PrimaryColor}>'change-model'</Text> to switch model</Text>
      </Box>
    </Box>
  );
};
