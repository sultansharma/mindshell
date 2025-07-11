import React from 'react';
import { Box, Text } from 'ink';
import { WelcomeBanner } from './welcome.js';

interface HeaderProps {
  currentDirectory: string;
}

export const Header: React.FC<HeaderProps> = ({ currentDirectory }) => {
  const formatDirectory = (dir: string) => {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    return dir.replace(home, '~');
  };

  return (
      <WelcomeBanner/>
  );
};
    {/* <Box alignItems="center">
        <Text color="gray">📁 </Text>
        <Text color="cyan">{formatDirectory(currentDirectory)}</Text>
      </Box> */}