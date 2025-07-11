import { Box, useApp, useInput,Text } from "ink";
import { Header } from "./components/Header.js";
import { OutputDisplay } from "./components/OutputDisplay.js";
import { InputPrompt } from "./components/InputPrompt.js";
import { useCallback, useState, useEffect } from "react";
import { CommandExecutor } from "./internal/commands/executor.js";
import { CommandOutput } from "./types/cli.js";
import { loadConfig, } from "./utils/config.js";
import { ChangeModel } from "./utils/changeModel.js";
import { WelcomeBanner } from "./components/welcome.js";
import { getAIResponse } from "./internal/ai/getAiResponse.js";
import { AIResponseRenderer } from "./internal/ai/responses/aiResponse.js";
import { InteractionResponse } from "./types/ai.js";
import { loadAskHistory, loadCommandHistory, loadHistory, saveAskHistory, saveCommandHistory, saveHistory } from "./utils/history.js";
import { downloadTracker, DownloadProgressEvent } from "./utils/downloadProgress.js";
import { DownloadProgress } from "./components/DownloadProgress.js";
import { CommandExecutor2 } from "./internal/commands/new.js";
import { handleCommand } from "./internal/commands/commandHandler.js";
import Spinner from "ink-spinner";

export const CLIShell: any = ({outputHis}:any) => {
      const { exit } = useApp();
      const [commandHistory, setCommandHistory] = useState<string[]>([]);
      const [outputHistory, setOutputHistory] = useState<CommandOutput[]>(outputHis);
      const [historyIndex, setHistoryIndex] = useState(-1);
      const [isExecuting, setIsExecuting] = useState(false);
      const [isAnalysingError, setAnalysingError] = useState(false);
      const [currentDirectory, setCurrentDirectory] = useState(process.cwd());
      const [step, setStep] = useState<'shell' | 'change-model'>('shell');
      const [response,setResponse] = useState<InteractionResponse | null>()
      const executor = new CommandExecutor();
      const executor2 = new CommandExecutor2();
      const [input, setInput] = useState('');
      const [prompt,setPrompt] = useState('');
      const [streamedOutput, setStreamedOutput] = useState<string[]>([]);


   const executeCommand = useCallback(async (command: string) => {
     if (!command.trim()) return;
 
     setIsExecuting(true);
     
     // Add to command history
     setCommandHistory(prev => [...prev, command]);
     setHistoryIndex(-1);
 
     try {
       // Handle special commands
       if (command.trim() === 'exit') {
         exit();
         return;
       }
 
       if (command.trim() === 'clear') {
         setOutputHistory([]);
         setIsExecuting(false);
         return;
       }

       if (command.trim() === 'change-model') {
        setOutputHistory((prev) => [
          ...prev,
          {
            prompt: command,
            command,
            output: "Model changing...",
            type: 'command',
            timestamp: new Date()
          }
        ]);
        setStep('change-model'); // 👈 this reuses your model selection step
        return;
      }

      const outputHistory = loadHistory();
 
       // Execute command
       const latestConfig = loadConfig();
       const isShellMode = latestConfig?.isShellModeActive ?? false;
       if (isShellMode) {
        // ✅ SHELL MODE: Execute as shell command
          executor2.on('output', (data: string) => {
             setStreamedOutput(prev => [...prev, ...data.split('\n')]);
          });
        const result = await executor2.executeCommand(command);
        setStreamedOutput([])
        const resultObj: CommandOutput = {
          prompt: command,
          command,
          output: result.output,
          type: result.error != null ? 'error' : 'command',
          error: result.error,
          timestamp: new Date()
        };
        setOutputHistory(prev => [...prev, resultObj]);
        saveHistory([...outputHistory , resultObj])  
        if(resultObj.type == 'error') {
            setIsExecuting(false)
            setAnalysingError(true)
            const errorResult = await handleCommand("",command)
            const resultObj: CommandOutput = {
                prompt: errorResult.nextResponse.command??'',
                command: errorResult.nextResponse.command??'',
                output: errorResult.nextResponse.content??'',
                type: errorResult.nextResponse.type??'',
                timestamp: new Date()
              };
            setResponse(errorResult.nextResponse)
            setOutputHistory(prev => [...prev, resultObj]);
        } 
      } else {
        // 🤖 AI MODE
        const aiResult = await getAIResponse(command);
        const resultObj: CommandOutput = {
          prompt: command,
          command: aiResult.command??'error',
          output: aiResult.content??'error',
          type: aiResult.type??'error',
          timestamp: new Date()
        };
        setOutputHistory(prev => [...prev, resultObj]);
        if(aiResult.type == "command" || aiResult.type =="diagnostic") {
            setResponse(aiResult);
        }
        saveHistory([...outputHistory , resultObj])
      }
     
       // Update current directory if pwd-related command
       if (command.startsWith('cd ') || command === 'pwd') {
         try {
           setCurrentDirectory(process.cwd());
         } catch {
           // Directory might not exist anymore
         }
       } 
     } catch (error) {
       const errorOutput: CommandOutput = {
         prompt: command,
         command: '',
         output: '',
         type: 'error',
         error: error instanceof Error ? error.message : 'Unknown error occurred',
         timestamp: new Date()
       };
       setOutputHistory(prev => [...prev, errorOutput]);
       saveHistory([...outputHistory , errorOutput]) 
     } finally {
       setIsExecuting(false);
       setAnalysingError(false)
     }
   }, [exit, executor]);
 
   const handleSubmit = useCallback((value: string) => {
     executeCommand(value);
     setPrompt(value)
     setInput('');

   }, [executeCommand]);
 
   // Handle keyboard navigation
    useInput((input, key) => {
     if (key.upArrow && commandHistory.length > 0) {
       const newIndex = historyIndex === -1 
         ? commandHistory.length - 1 
         : Math.max(0, historyIndex - 1);
       setHistoryIndex(newIndex);
       setInput(commandHistory[newIndex] || '');
     } else if (key.downArrow && historyIndex !== -1) {
       const newIndex = historyIndex + 1;
       if (newIndex >= commandHistory.length) {
         setHistoryIndex(-1);
         setInput('');
       } else {
         setHistoryIndex(newIndex);
         setInput(commandHistory[newIndex] || '');
       }
     }
   });

if (step === 'change-model') {
    return (
      <Box flexDirection="column">
       <WelcomeBanner/>
       <ChangeModel
        onComplete={(onComplete:any) => {
          // Reload updated config
          loadConfig();
        
          setStep(onComplete); // return to CLI
        }}
      />
      </Box>
    );
}


if (response != null && (response.type == "command" || response.type == "diagnostic")) {
    return AIResponseRenderer(
      response,
      () => {
       // refreshHistory(); 
        setResponse(null); // Done with response
        setOutputHistory(loadHistory());
      },
      (nextResponse) => {
       // refreshHistory(); 
        setResponse(nextResponse); // 🔁 Swap to new AI response (e.g., diagnostic)
        setOutputHistory(loadHistory());
      },
      prompt
    );
}


 

return (<Box flexDirection="column" height="100%">
      <Header currentDirectory={currentDirectory} />
      
      <Box flexDirection="column" flexGrow={1} marginTop={1}>
        <OutputDisplay 
          outputs={outputHistory} 
          isExecuting={isExecuting}
        />
      </Box>

      {isAnalysingError && (
    <Box alignItems="center" marginTop={1}>
      <Text color="blue">
        <Spinner type="dots"/>
      </Text>
      <Text color="blue" > {` Analysing error...`}</Text>
    </Box>
  )}
      {streamedOutput.length > 0 ? 
      <Box
      flexDirection="column"
      //overflow="auto"
      alignItems="center"
      flexShrink={2}
      borderTopColor={"gray"}
      borderStyle="classic"
      padding={1}
      marginBottom={0}
      overflow="hidden"
      height={10}
    >

      {streamedOutput.map((line, i) => (
       <Box>
        <Text  wrap="wrap" key={i}>
            {line}
        </Text>
        </Box>
      ))}
    </Box> :
      
      <Box marginTop={1} paddingTop={1}>
        <InputPrompt 
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          isExecuting={isExecuting}
          currentDirectory={currentDirectory}
        />
      </Box> }
    </Box>
  );
}