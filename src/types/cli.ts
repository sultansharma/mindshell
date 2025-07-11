export interface CommandOutput {
  prompt: string;
  command?: string;
  output: string;
  error?: string;
  timestamp: Date;
  type: string;
  exitCode?: number;
}

export interface BuiltInCommand {
  name: string;
  description: string;
  execute: (args: string[]) => Promise<CommandOutput> | CommandOutput;
}

export interface CLIState {
  currentInput: string;
  commandHistory: string[];
  outputHistory: CommandOutput[];
  isExecuting: boolean;
  showHelp: boolean;
  historyIndex: number;
}