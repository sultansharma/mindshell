import { spawn } from 'child_process';
import EventEmitter from 'events';
import { CommandOutput, BuiltInCommand } from '../../types/cli.js';
import { builtInCommands } from '../commands/builtins.js';

export class CommandExecutor2 extends EventEmitter {
  private builtIns: Map<string, BuiltInCommand>;

  constructor() {
    super();
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

    // Check built-in commands first
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

    // Run external system commands with spawn for streaming
    return new Promise((resolve, reject) => {
      let fullOutput = '';
      let fullError = '';

      const child = spawn(command, args, { shell: true });

      // Listen for stdout data line-by-line
      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        fullOutput += text;
        this.emit('output', text);  // emit live output event
      });

      // Listen for stderr data line-by-line (often progress goes here)
      child.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        fullError += text;
        this.emit('output', text);  // also emit stderr output live
      });

      child.on('error', (error) => {
        reject(error);
      });

      child.on('close', (code) => {
        resolve({
          prompt: input,
          command: trimmedInput,
          type: 'command',
          output: fullOutput.trim(),
          error: fullError.trim() || undefined,
          timestamp: new Date(),
          exitCode: code ?? 0
        });
      });
    });
  }

  getBuiltInCommands(): BuiltInCommand[] {
    return Array.from(this.builtIns.values());
  }
}
