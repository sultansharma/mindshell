import React from 'react';
import { Box, Text } from 'ink';

interface ProgressBarProps {
  progress: number; // 0-100
  width?: number;
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  width = 40, 
  color = 'green' 
}) => {
  const filledWidth = Math.floor((progress / 100) * width);
  const emptyWidth = width - filledWidth;
  
  const filledBar = '█'.repeat(filledWidth);
  const emptyBar = '░'.repeat(emptyWidth);
  
  return (
    <Box>
      <Text color={color}>{filledBar}</Text>
      <Text color="gray">{emptyBar}</Text>
      <Box marginLeft={1}>
        <Text color={color}>{Math.round(progress)}%</Text>
      </Box>
    </Box>
  );
}; 