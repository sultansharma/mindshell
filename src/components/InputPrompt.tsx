import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import fs from 'fs';
import path from 'path';
import { loadAskHistory, loadCommandHistory, saveAskHistory, saveCommandHistory } from '../utils/history.js';
import { loadConfig, saveConfig } from '../utils/config.js';

interface InputPromptProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isExecuting: boolean;
  currentDirectory: string;
}

export const InputPrompt: React.FC<InputPromptProps> = ({
  input,
  onInputChange,
  onSubmit,
  isExecuting,
  currentDirectory
}) => {
  const [width, setWidth] = useState(process.stdout.columns || 80);
  const config = loadConfig();
  const [isShellMode, setIsShellMode] = useState(config?.isShellModeActive ?? false);
  const [folderSuggestions, setFolderSuggestions] = useState<string[]>([]);
  const [showHistoryMenu, setShowHistoryMenu] = useState(false);
  const [commandsHistory, setCommandsHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  
  useEffect(() => {
    if(isShellMode) {
      setCommandsHistory((loadCommandHistory() || []).slice(-100));
    } else {
      setCommandsHistory((loadAskHistory() || []).slice(-100)); // show latest first
    }
   
  }, [isShellMode]);

  useEffect(() => {
    if (showHistoryMenu && commandsHistory.length > 0) {
      const lastIndex = commandsHistory.length - 1;
      setScrollOffset(Math.max(0, commandsHistory.length - 4));
      setHistoryIndex(lastIndex); // focus on the last item
    }
  }, [showHistoryMenu, commandsHistory]);

  useEffect(() => {
    const onResize = () => {
      setWidth(process.stdout.columns || 80);
    };
    process.stdout.on('resize', onResize);
    return () => {
      process.stdout.off('resize', onResize);
    };
  }, []);

  useEffect(() => {
    if (input.startsWith('!')) {
      setIsShellMode(prev => {
        const newState = !prev;
  
        if (config) {
          config.isShellModeActive = newState;
          saveConfig(config);
        }
  
        return newState;
      });

      onInputChange(input.slice(1));
    }
  }, [input]);

  useEffect(() => {
    if (input.startsWith('cd ')) {
      const cdPath = input.slice(3); // Remove 'cd '
      
      try {
        let targetDirectory = currentDirectory;
        let filterPrefix = '';
        
        // Check if path contains a slash
        if (cdPath.includes('/')) {
          const pathParts = cdPath.split('/');
          const completeParts = pathParts.slice(0, -1); // All parts except the last
          const incompletePart = pathParts[pathParts.length - 1]; // The part being typed
          
          // Build the target directory from complete parts
          if (completeParts.length > 0 && completeParts[0] !== '') {
            for (const part of completeParts) {
              if (part === '..') {
                targetDirectory = path.dirname(targetDirectory);
              } else if (part === '.' || part === '') {
                // Stay in current directory
              } else {
                const newPath = path.join(targetDirectory, part);
                if (fs.existsSync(newPath) && fs.statSync(newPath).isDirectory()) {
                  targetDirectory = newPath;
                } else {
                  // Invalid path, clear suggestions
                  setFolderSuggestions([]);
                  return;
                }
              }
            }
          }
          
          filterPrefix = incompletePart;
        } else {
          // No slash, just filter current directory
          filterPrefix = cdPath;
        }
        
        // Get folders from target directory
        const allFolders = fs.readdirSync(targetDirectory)
          .filter(file => {
            const fullPath = path.join(targetDirectory, file);
            return fs.statSync(fullPath).isDirectory();
          });
        
        // Filter folders based on what's being typed
        const filteredFolders = allFolders.filter(folder => 
          folder.toLowerCase().startsWith(filterPrefix.toLowerCase())
        );
        
        setFolderSuggestions(filteredFolders);
      } catch (err) {
        setFolderSuggestions([]);
      }
    } else {
      setFolderSuggestions([]);
    }
  }, [input, currentDirectory]);

  const handleSubmit = (value: string) => {
    if(isShellMode) {
      const oldHistory = loadCommandHistory() || [];
      saveCommandHistory([...oldHistory , value])
      setCommandsHistory((loadCommandHistory() || []).slice(-100)); 
    } else {
      const oldHistory = loadAskHistory() || [];
      saveAskHistory([...oldHistory , value])
      setCommandsHistory((loadAskHistory() || []).slice(-100)); 
    }
    onSubmit(value);
  };

  const [scrollOffset, setScrollOffset] = useState(0);

useInput((input, key) => {
  if (isExecuting) return;

  if (key.upArrow) {
    // Show history menu when starting navigation
    setShowHistoryMenu(true);
    
    setHistoryIndex(prev => {
      if (prev === null && commandsHistory.length > 0) {
        const lastIndex = commandsHistory.length - 1;
        // Adjust scroll to show the selected item
        const windowSize = 4;
        if (lastIndex < scrollOffset) {
          setScrollOffset(Math.max(0, lastIndex - windowSize + 1));
        } else if (lastIndex >= scrollOffset + windowSize) {
          setScrollOffset(lastIndex - windowSize + 1);
        }
        onInputChange(commandsHistory[lastIndex]);
        return lastIndex;
      }
      if (prev !== null && prev > 0) {
        const newIndex = prev - 1;
        // Adjust scroll to show the selected item
        const windowSize = 4;
        if (newIndex < scrollOffset) {
          setScrollOffset(Math.max(0, newIndex));
        }
        onInputChange(commandsHistory[newIndex]);
        return newIndex;
      }
      return prev; // stay at the top
    });
  }

  if (key.downArrow) {
    // Only work if history menu is already shown
    if (!showHistoryMenu) return;
    
    setHistoryIndex(prev => {
      if (prev === null) return null;
      const lastIndex = commandsHistory.length - 1;

      // If at the last index, next down arrow should clear input and reset index
      if (prev === lastIndex) {
        onInputChange('');
        return null;
      }
  
      const newIndex = prev + 1;
  
      // Scroll handling
      const windowSize = 4;
      if (newIndex >= scrollOffset + windowSize) {
        setScrollOffset(Math.min(newIndex - windowSize + 1, commandsHistory.length - windowSize));
      }

      onInputChange(commandsHistory[newIndex]);
      return newIndex;

      // Stay at the last item, don't clear input
      return prev;
    });
  }

  if (key.return) {
    setCommandsHistory((loadCommandHistory() || []).slice(-100)); 
    setHistoryIndex(null);
    setShowHistoryMenu(false);
    setScrollOffset(0); // Reset scroll on selection
  }

  if (key.escape) {
    setHistoryIndex(null);
    setShowHistoryMenu(false);
    setScrollOffset(0); // Reset scroll on escape
    onInputChange(''); // Clear input on escape
  }
});
  // Get the current path being typed for display context
const getCurrentPathContext = () => {
    if (!input.startsWith('cd ')) return '';
    
    const cdPath = input.slice(3);
    if (cdPath.includes('/')) {
      const pathParts = cdPath.split('/');
      const completeParts = pathParts.slice(0, -1);
      return completeParts.join('/') + (completeParts.length > 0 ? '/' : '');
    }
    return '';
  };


  return (
    <Box flexDirection="column">
    {showHistoryMenu && commandsHistory.length > 0 && (
    <Box flexDirection="column" marginBottom={1} height={4 + 2}>
    <Text color="yellow">{isShellMode ? `📟 Commands Histrory` : `💬 Ask History:`} </Text>
    <Box flexDirection="column" paddingLeft={2}>
      {commandsHistory
        .slice(scrollOffset, scrollOffset + 4)
        .map((command, i) => {
          const actualIndex = scrollOffset + i;
          return (
            <Text
              key={actualIndex}
              color={historyIndex === actualIndex ? "cyan" : "gray"}
              backgroundColor={historyIndex === actualIndex ? "blue" : undefined}
            >
              {historyIndex === actualIndex ? "► " : "  "}
              {command}
            </Text>
          );
        })}
    </Box>
    <Text dimColor color="gray">
      ⬆⬇ to navigate, ENTER to select, ESC to cancel
    </Text>
  </Box>
)}
      <Box flexDirection='row' alignItems='flex-end' justifyContent='flex-end'>
        <Text color={'gray'}>
          {folderSuggestions.length > 0 ? `${folderSuggestions.length} matches` : ''}
        </Text>
        <Text color={'gray'}>
          {isShellMode ? ` Shell mode is active! ` : ` Ask for command suggestion `}
        </Text>
      </Box>

      <Box
        borderStyle="round"
        borderColor={isShellMode ? 'cyan' : '#FFA500'}
        paddingX={1}
        paddingY={0}
        width={width}
        flexGrow={1}
      >
        {!isExecuting ? (
          <Box flexDirection='row'>
            <Text>{isShellMode ? `📟 ` : `💬 `}</Text>
            <TextInput
              key={input} 
              value={input}
              onChange={onInputChange}
              onSubmit={handleSubmit}
              placeholder={isShellMode ? "Shell mode...(exit with !)" : "Ask for anything... (Shell mode with !)"}
              showCursor
            />
          </Box>
        ) : (
          <Text color="gray" italic>Please wait for the current command to finish...</Text>
        )}
      </Box>
      
      {folderSuggestions.length > 0 && (
        <Box flexDirection="column" marginTop={1} paddingLeft={2}>
          <Text color="yellow">
            📁 Folders{getCurrentPathContext() ? ` in ${getCurrentPathContext()}` : ' in current directory'}:
          </Text>
          {folderSuggestions.slice(0, 10).map((folder, index) => (
            <Text key={index} color="cyan">• {folder}</Text>
          ))}
          {folderSuggestions.length > 10 && (
            <Text color="gray">... and {folderSuggestions.length - 10} more</Text>
          )}
        </Box>
      )}
    </Box>
  );
};