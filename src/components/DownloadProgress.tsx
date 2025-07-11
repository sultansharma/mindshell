import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { PrimaryColor } from '../utils/constant.js';
import { ProgressBar } from './ProgressBar.js';
import { DownloadProgressEvent } from '../utils/downloadProgress.js';

interface DownloadProgressProps {
  model: string;
  progress: string;
  isDownloading: boolean;
  stage?: DownloadProgressEvent['stage'];
  percentage?: number;
}

export const DownloadProgress: React.FC<DownloadProgressProps> = ({ 
  model, 
  progress, 
  isDownloading,
  stage,
  percentage
}) => {
  // Check if this is an error state
  const isError = progress.includes('Download failed') || progress.includes('error') || progress.includes('failed');
  
  // Use provided percentage or try to extract from progress text
  const progressPercentage = percentage !== undefined ? percentage : 
    (() => {
      const percentageMatch = progress.match(/(\d+(?:\.\d+)?)%/);
      return percentageMatch ? parseFloat(percentageMatch[1]) : null;
    })();
  
  const getStageColor = (stage?: DownloadProgressEvent['stage']) => {
    switch (stage) {
      case 'downloading': return 'blue';
      case 'verifying': return 'yellow';
      case 'writing': return 'magenta';
      case 'complete': return 'green';
      default: return 'gray';
    }
  };

  const getStageIcon = (stage?: DownloadProgressEvent['stage']) => {
    switch (stage) {
      case 'downloading': return '📥';
      case 'verifying': return '🔍';
      case 'writing': return '💾';
      case 'complete': return '✅';
      default: return '⏳';
    }
  };
  
  if (!isDownloading) {
    // Show completion or error state
    return (
      <Box flexDirection="column" alignItems="center" paddingY={2}>
        <Box alignItems="center" marginBottom={1}>
          {isError ? (
            <Text color="red">❌</Text>
          ) : (
            <Text color="green">✅</Text>
          )}
          <Box marginLeft={1}>
            <Text color={isError ? "red" : "green"} bold>
              {progress}
            </Text>
          </Box>
        </Box>
        
        <Box marginTop={1}>
          {isError ? (
            <Text color="red">
              Failed to download model <Text color="cyan" bold>{model}</Text>
            </Text>
          ) : (
            <Text color="gray">
              Model <Text color="cyan" bold>{model}</Text> is ready to use!
            </Text>
          )}
        </Box>
        
        {isError && (
          <Box marginTop={1}>
            <Text color="yellow">
              Please check your internet connection and try again.
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" alignItems="center" paddingY={2}>
      <Box alignItems="center" marginBottom={1}>
        <Text color={PrimaryColor}>
          <Spinner type="dots" />
        </Text>
        <Box marginLeft={1}>
          <Text color="blue">
            Downloading Ollama model: <Text color="cyan" bold>{model}</Text>
          </Text>
        </Box>
      </Box>
      
      <Box flexDirection="column" alignItems="center" width={60}>
        <Box marginBottom={1}>
          <Text color="gray">
            This may take several minutes depending on your internet connection...
          </Text>
        </Box>
        
        {stage && (
          <Box marginBottom={1} alignItems="center">
            <Text color={getStageColor(stage)}>
              {getStageIcon(stage)} {stage.charAt(0).toUpperCase() + stage.slice(1)}...
            </Text>
          </Box>
        )}
        
        {progressPercentage !== null && (
          <Box marginBottom={1} width="100%">
            <ProgressBar progress={progressPercentage} width={50} color="green" />
          </Box>
        )}
        
        {progress && (
          <Box flexDirection="column" width="100%">
            <Box marginBottom={1}>
              <Text color="yellow">
                {progress}
              </Text>
            </Box>
          </Box>
        )}
        
        <Box marginTop={1}>
          <Text color="gray" italic>
            Please wait, do not interrupt the download...
          </Text>
        </Box>
      </Box>
    </Box>
  );
}; 