// import React, { useState, useEffect } from 'react';
// import { Box, Text } from 'ink';
// import { loadConfig, saveConfig, isValidConfig, modelOptions } from './utils/config.js';
// import { loadHistory, saveHistory } from './utils/history.js';
// import TextInput from 'ink-text-input';
// import { CLIShell } from './cliShell.js';
// import { Config } from './types/config';
// import {PrimaryColor} from './utils/constant.js'
// import SelectInput from 'ink-select-input';
// import { CommandOutput } from './types/cli.js';
// import Spinner from 'ink-spinner';
// import path from 'path';
// import fs from 'fs';

// export const CLI: React.FC = () => {
//   const [config, setConfig] = useState<Config | null>(null);
//   const [step, setStep] = useState<'model' | 'apikey' | 'verifyProjectDir' | 'setProjectDirManual' | 'ready'>('model');
//   const [outputHistory, setOutputHistory] = useState<CommandOutput[]>([]);
//   const [selectedModelIndex, setSelectedModelIndex] = useState<number | null>(null);
//   const [apiKeyInput, setApiKeyInput] = useState('');
//   const [loading, setLoading] = useState(true);
//   const [projectRoot, setProjectRoot] = useState<string>(process.cwd());
//   const [confirmationInput, setConfirmationInput] = useState(''); // For confirmation Y/n
//   const [errorMsg, setErrorMsg] = useState<string | null>(null);

//   useEffect(() => {
//     const init = () => {
//       const initialHistory = loadHistory();
//       setOutputHistory(initialHistory);
     
//       const cfg = loadConfig();
//       if (cfg && isValidConfig(cfg)) {
//         setConfig(cfg);
//         setStep('ready');
//       }
//       setTimeout(() => setLoading(false), 3000);
//      // setLoading(false); // Done loading
//     };
  
//     init();
//   }, []);
  




//   // ✅ STEP 1 — SELECT MODEL
//   if (step === 'model') {
//     const handleSelect = (item: { label: string; value: number }) => {
//       setSelectedModelIndex(item.value);
//       setStep('apikey');
//     };
  
//     return (
//       <Box flexDirection="column">
//         <Text>Select a model to use:</Text>
//         <Box marginTop={1}>
//           <SelectInput
//             items={modelOptions.map((opt: any, index: number) => ({
//               label: `${index + 1}. ${opt.label}`,
//               value: index
//             }))}
//             onSelect={handleSelect}
//           />
//         </Box>
//       </Box>
//     );
//   }
//   // ✅ STEP 2 — ENTER API KEY
//   if (step === 'apikey' && selectedModelIndex !== null) {
//     const selectedModel = modelOptions[selectedModelIndex];
//     const provider = selectedModel.model.split(':')[0];

//     return (
//       <Box flexDirection="column">
//         <Text>🔑 Enter API key for {provider}:</Text>
//         <Box marginTop={1}>
//           <TextInput
//             value={apiKeyInput}
//             onChange={setApiKeyInput}
//             onSubmit={() => {
//               const newCfg: Config = {
//                 model: selectedModel.model,
//                 APIKeys: {
//                   [provider]: apiKeyInput
//                 }
//               };
//               saveConfig(newCfg);
//               setConfig(newCfg);
//               setStep('ready');
//             }}
//           />
//         </Box>
//       </Box>
//     );
//   }

//    // STEP 3 - Verify or set project root folder for mindshell directory
//    if (step === 'verifyProjectDir') {
//     const mindshellPath = path.join(projectRoot, '.mindshell');
//     const mindshellExists = fs.existsSync(mindshellPath);

//     return (
//       <Box flexDirection="column">
//         <Text>
//           {mindshellExists
//             ? `.mindshell directory found at: {projectRoot}`
//             : `.mindshell directory not found in current directory:`}
//         </Text>
//         <Text>
//           Project root folder where MindShell data will be saved:
//         </Text>
//         <Text color="cyan">{projectRoot}</Text>
//         <Text>
//           Do you want to use this directory? (Y/n)
//         </Text>
//         <Box marginTop={1}>
//           <TextInput
//             value={confirmationInput}
//             onChange={setConfirmationInput}
//             onSubmit={() => {
//               const normalized = confirmationInput.trim().toLowerCase();
//               if (normalized === 'n') {
//                 // Ask user to enter new folder path
//                 setStep('setProjectDirManual');
//               } else {
//                 // Confirm and save config with projectRoot
//                 const selectedModel = modelOptions[selectedModelIndex!];
//                 const provider = selectedModel.model.split(':')[0];
//                 const newCfg: Config = {
//                   model: selectedModel.model,
//                   APIKeys: {
//                     [provider]: apiKeyInput.trim()
//                   },
//                   // You can save projectRoot path in config for reference
//                   // as an additional property (you can extend Config interface)
//                   // For example:
//                   // projectRoot,
//                 };
//                 saveConfig(newCfg, projectRoot);
//                 setConfig(newCfg);
//                 setStep('ready');
//               }
//               setConfirmationInput('');
//             }}
//           />
//         </Box>
//       </Box>
//     );
//   }

//   // Optional step: Let user manually enter project root if they say no above
//   if (step === 'setProjectDirManual') {
//     return (
//       <Box flexDirection="column">
//         <Text>Please enter the full path for your project root:</Text>
//         <Box marginTop={1}>
//           <TextInput
//             value={projectRoot}
//             onChange={setProjectRoot}
//             onSubmit={() => {
//               if (!fs.existsSync(projectRoot)) {
//                 setErrorMsg('Directory does not exist. Please enter a valid path.');
//                 return;
//               }
//               setErrorMsg(null);
//               setStep('verifyProjectDir'); // Go back to verify screen to confirm
//             }}
//           />
//         </Box>
//         {errorMsg && <Text color="red">{errorMsg}</Text>}
//       </Box>
//     );
//   }

//   // ✅ STEP 5 — Show real CLI once config is valid
//   if (step === 'ready' && config) {
//     return (
//       <CLIShell config={config} outputHis={outputHistory} />
//     );
//   }

//   return null;
// };


import React, { useState, useEffect } from 'react';
import { loadConfig, saveConfig, isValidConfig, modelOptions, determineProjectStep, validateDirectoryPath, handleProjectConfirmation } from './utils/config.js';
import { loadHistory } from './utils/history.js';
import { SelectModel } from './components/SelectMode.js';
import { EnterApiKey } from './components/AskKey.js';
import { VerifyProjectDir } from './components/ProjectDirctory.js';
import { CLIReady } from './components/CliReady.js';
import { SetProjectDirManual } from './components/SetProjectDirManual.js';
import { Config } from './types/config.js';
import { Box,Text } from 'ink';
import Spinner from 'ink-spinner';
import { PrimaryColor } from './utils/constant.js';
import { CommandOutput } from './types/cli.js';


export const CLI: React.FC = () => {
  const [step, setStep] = useState<'model' | 'apikey' | 'verifyProjectDir' | 'setProjectDirManual' | 'ready'>('model');
  const [config, setConfig] = useState<Config | null>(null);
  const [projectRoot, setProjectRoot] = useState(process.cwd());
  const [selectedModelIndex, setSelectedModelIndex] = useState<number | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [outputHistory, setOutputHistory] = useState<CommandOutput[] | []>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading , setLoading] = useState(true);
  
  useEffect(() => {
    const cfg = loadConfig();
    if (cfg && isValidConfig(cfg)) {
      setConfig(cfg);
      // Check project directory setup
      const projectStep = determineProjectStep(projectRoot);
      setStep(projectStep);
    } else {
      setStep('model');
    }
    setTimeout(() => setLoading(false), 3000);
    const output = loadHistory();
    setOutputHistory(output);
  }, []);

  // Handle project directory confirmation
  const handleProjectDirConfirmation = (userInput: string) => {
    const result = handleProjectConfirmation(userInput, projectRoot);
    
    if (result.success) {
      setError(null);
      setStep(result.nextStep as any);
    } else {
      setError(result.error || 'Unknown error occurred');
    }
  };

  // Handle manual project directory input
  const handleManualProjectDir = (newPath: string) => {
    if (!validateDirectoryPath(newPath)) {
      setError('Directory does not exist. Please enter a valid path.');
      return;
    }
    
   // setError(null);
    setProjectRoot(newPath);
    setStep('verifyProjectDir');
  };

  // Handle API key submission
  const handleApiKeySubmit = (newConfig: Config) => {
    saveConfig(newConfig);
    setConfig(newConfig);
    
    // After API key is set, check project directory
    const projectStep = determineProjectStep(projectRoot);
    setStep(projectStep);
  };

  if (loading) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" height={5}>
        <Text color={PrimaryColor}>
          <Spinner type="dots" /> Initializing 🧠 MindShell CLI...
        </Text>
      </Box>
    );
  }

  switch (step) {
    case 'model':
      return (
        <SelectModel
          modelOptions={modelOptions}
          onSelect={(index) => {
            setSelectedModelIndex(index);
            setStep('apikey');
          }}
        />
      );
    case 'apikey':
      return (
        <EnterApiKey
          selectedModel={modelOptions[selectedModelIndex!]}
          apiKey={apiKeyInput}
          setApiKey={setApiKeyInput}
          onSubmit={(newConfig) => {
            setConfig(newConfig);
            setStep('verifyProjectDir');
          }}
        />
      );
    case 'verifyProjectDir':
      return (
        <VerifyProjectDir
          projectRoot={projectRoot}
          setProjectRoot={setProjectRoot}
          onConfirmed={() => setStep('ready')}
          onReject={() => setStep('setProjectDirManual')}
          config={config}
          setConfig={setConfig}
          apiKeyInput={apiKeyInput}
          selectedModelIndex={selectedModelIndex}
        />
      );
    case 'setProjectDirManual':
      return (
        <SetProjectDirManual
          projectRoot={projectRoot}
          setProjectRoot={setProjectRoot}
          onValid={() => setStep('verifyProjectDir')}
        />
      );
    case 'ready':
      return <CLIReady config={config} outputHistory={outputHistory} />;
  }

  return null;
};

