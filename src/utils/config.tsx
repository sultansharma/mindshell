
  // src/configManager.ts
  import fs from 'fs';
  import os from 'os';
  import path from 'path';
  import { Config } from '../types/config.js';

  export function getConfigDir(): string {
    return path.join(os.homedir(), '.mindshell');
  }
  
  const globalConfigFile = path.join(getConfigDir(), 'config.json');
  
  export function loadConfig(folderPath?: string): Config | null {
    try {
      const dir = folderPath ? path.join(folderPath, '.mindshell') : getConfigDir();
      const configFile = path.join(dir, 'config.json');
      if (!fs.existsSync(configFile)) return null;
  
      const raw = fs.readFileSync(configFile, 'utf-8');
      const parsed: Config = JSON.parse(raw);
  
      // Ensure isShellModeActive is always set (default false)
      if (typeof parsed.isShellModeActive !== 'boolean') {
        parsed.isShellModeActive = false;
      }
  
      return parsed;
    } catch (err) {
      return null;
    }
  }
  
  export function saveConfig(cfg: Config, folderPath?: string) {
    const dir = folderPath ? path.join(folderPath, '.mindshell') : getConfigDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, 'config.json');
    fs.writeFileSync(filePath, JSON.stringify(cfg, null, 2), 'utf8');
  }
  
  export function isValidConfig(cfg: Config): boolean {
    if (!cfg.model) return false;
    const provider = cfg.model.split(':')[0];
    if (["openai", "gemini", "claude"].includes(provider)) {
      return cfg.APIKeys?.[provider]?.length > 0;
    }
    return true;
  }

// Function to check if .mindshell directory exists
export const checkMindshellExists = (projectRoot = process.cwd()) => {
  const mindshellPath = path.join(projectRoot, '.mindshell');
  return fs.existsSync(mindshellPath);
};

// Function to create .mindshell directory if it doesn't exist
export const createMindshellDir = (projectRoot = process.cwd()) => {
  const mindshellPath = path.join(projectRoot, '.mindshell');
  if (!fs.existsSync(mindshellPath)) {
    fs.mkdirSync(mindshellPath, { recursive: true });
  }
  return mindshellPath;
};

// Function to save project path to config.json
export const saveProjectPath = (projectRoot = process.cwd()) => {
  try {
    const mindshellPath = createMindshellDir(projectRoot);
    const configPath = path.join(mindshellPath, 'config.json');
    
    // Read existing config if it exists
    let existingConfig = {};
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      existingConfig = JSON.parse(configData);
    }
    
    // Update with project path
    const newConfig = {
      ...existingConfig,
      ProjectPath: projectRoot
    };
    
    // Save to file
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving project path:', error);
    return false;
  }
};

// Function to load project path from config.json
export const loadProjectPath = (projectRoot = process.cwd()) => {
  try {
    const configPath = path.join(projectRoot, '.mindshell', 'config.json');
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      return true
    }
    return null;
  } catch (error) {
    console.error('Error loading project path:', error);
    return null;
  }
};


// Main function to determine which step to show
export const determineProjectStep = (currentPath = process.cwd()) => {
  const mindshellExists = checkMindshellExists(currentPath);
  
  if (mindshellExists) {
    const savedPath = loadProjectPath(currentPath);
    if (savedPath) {
      return 'ready'; // Already configured
    }
    return 'verifyProjectDir'; // .mindshell exists but no project path saved
  }
  
  return 'verifyProjectDir'; // No .mindshell directory, need to verify
};

// Function to handle user confirmation for project directory
export const handleProjectConfirmation = (userInput:any, projectRoot = process.cwd()) => {
  const normalized = userInput.trim().toLowerCase();
  
  if (normalized === 'y' || normalized === 'yes' || normalized === '') {
    // User confirmed - save the project path
    const success = saveProjectPath(projectRoot);
    if (success) {
      return { success: true, nextStep: 'ready' };
    } else {
      return { success: false, error: 'Failed to save project configuration' };
    }
  } else if (normalized === 'n' || normalized === 'no') {
    // User wants to set different directory
    return { success: true, nextStep: 'setProjectDirManual' };
  } else {
    // Invalid input
    return { success: false, error: 'Please enter Y for yes or N for no' };
  }
};

// Function to validate if a directory path exists
export const validateDirectoryPath = (dirPath:any) => {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch (error) {
    return false;
  }
};


//   const configDir = path.join(os.homedir(), '.mindshell');
//   const configFile = path.join(configDir, 'config.json');
  
//   export function loadConfig(): Config | null {
//     try {
//       const raw = fs.readFileSync(configFile, 'utf-8');
//       const parsed: Config = JSON.parse(raw);

//     // Ensure isShellModeActive is always set (default to false)
//     if (typeof parsed.isShellModeActive !== 'boolean') {
//       parsed.isShellModeActive = false;
//     }

//     return parsed;
//     } catch (err) {
//       return null;
//     }
//   }

  
// export function saveConfig(cfg: Config, folderPath?: string) {
//   const dir = folderPath ? path.join(folderPath, '.mindshell') : getConfigDir();
//   if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
//   const filePath = path.join(dir, 'config.json');
//   fs.writeFileSync(filePath, JSON.stringify(cfg, null, 2), 'utf8');
// }
  
//   export function isValidConfig(cfg: Config): boolean {
//     if (!cfg.model) return false;
//     const provider = cfg.model.split(':')[0];
//     if (["openai", "gemini", "claude"].includes(provider)) {
//       return cfg.APIKeys?.[provider]?.length > 0;
//     }
//     return true;
//   }

//   export function saveConfig(cfg: Config) {
//     fs.mkdirSync(CONFIG_DIR, { recursive: true });
//     fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
//   }
  
  export const modelOptions = [
    { label: 'OpenAI GPT-4o', model: 'openai:gpt-4o' },
    { label: 'OpenAI GPT-4o Mini', model: 'openai:gpt-4o-mini' },
    { label: 'OpenAI GPT-4.1', model: 'openai:gpt-4.1' },
    { label: 'OpenAI GPT-4.1 Mini', model: 'openai:gpt-4.1-mini' },
    { label: 'OpenAI GPT-4.1 Nano', model: 'openai:gpt-4.1-nano' },
    { label: 'OpenAI GPT-4.5 Preview', model: 'openai:gpt-4.5-preview' },
    { label: 'Gemini 2.5 Pro Preview (05-06)', model: 'gemini:gemini-2.5-pro-preview-05-06' },
    { label: 'Gemini 2.5 Flash', model: 'gemini:gemini-2.5-flash' },
    { label: 'Gemini 2.5 Flash Preview (04-17)', model: 'gemini:gemini-2.5-flash-preview-04-17' },
    { label: 'Gemini 2.0 Flash Lite', model: 'gemini:gemini-2.0-flash-lite' },
    { label: 'Gemini 2.0 Flash', model: 'gemini:gemini-2.0-flash' },
    { label: 'Ollama Phi (Local)', model: 'ollama:phi' },
    { label: 'Ollama Phi 3.5 (Local)', model: 'ollama:phi3.5' },
    { label: 'Ollama LLaMA 3 (Local)', model: 'ollama:llama3' },
    { label: 'Ollama Mistral (Local)', model: 'ollama:mistral' }
  ];

  