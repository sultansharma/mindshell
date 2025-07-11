import { exec } from 'child_process';
import { promisify } from 'util';
import { CommandOutput, BuiltInCommand } from '../../types/cli.js';
import { builtInCommands } from '../commands/builtins.js';

const execAsync = promisify(exec);
export class CommandExecutor {
  private builtIns: Map<string, BuiltInCommand>;

  constructor() {
    this.builtIns = new Map();
    builtInCommands.forEach(cmd => {
      this.builtIns.set(cmd.name, cmd);
    });
  }

  async executeCommand(input: string): Promise<CommandOutput> {
    const trimmedInput = input.trim();
    if (!trimmedInput) {
      return {
        prompt: input,
        command: '',
        type: '',
        output: '',
        timestamp: new Date()
      };
    }

    const [command, ...args] = trimmedInput.split(' ');
    
    // Check for built-in commands
    const builtIn = this.builtIns.get(command);
    if (builtIn) {
      try {
        const result = await builtIn.execute(args);
        return result;
      } catch (error) {
        return {
          prompt: input,
          command: trimmedInput,
          output: '',
          type: 'command',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        };
      }
    }

    // Execute system command
    try {
      const { stdout, stderr } = await execAsync(trimmedInput, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      });
    

      return {
        prompt: input,
        command: trimmedInput,
        type: 'command',
        output: stdout.trim(),
        error: stderr.trim() || undefined,
        timestamp: new Date(),
        exitCode: 0
      };
    } catch (error: any) {
      return {
        prompt: input,
        command: trimmedInput,
        type: 'command',
        output: error.stdout?.trim() || '',
        error: error.stderr?.trim() || error.message || 'Command execution failed',
        timestamp: new Date(),
        exitCode: error.code || 1
      };
    }
  }

  getBuiltInCommands(): BuiltInCommand[] {
    return Array.from(this.builtIns.values());
  }
}