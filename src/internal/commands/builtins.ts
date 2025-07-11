import { BuiltInCommand } from '../../types/cli.js';
import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export const builtInCommands: BuiltInCommand[] = [
  {
    name: 'help',
    description: 'Show available commands',
    execute: () => ({
      prompt: 'help',
      command: 'help',
      output: `
  help     Show this help message                       
clear    Clear the output history                     
exit     Exit the CLI application                     
pwd      Show current working directory               
ls       List directory contents                      
cat      Display file contents                        
echo     Display text                                 
date     Show current date and time                   
whoami   Show current user                            
                                                        
Any other command will be executed in the system    
shell. Use Ctrl+C to exit or 'exit' command.         
      `.trim(),
      type: 'command',
      timestamp: new Date()
    })
  },
  {
    name: 'clear',
    description: 'Clear the output history',
    execute: () => ({
      prompt: 'clear',
      command: 'clear',
      output: '✨ Output history cleared',
      timestamp: new Date(),
      type: 'command'
    })
  },
  {
    name: 'pwd',
    description: 'Show current working directory',
    execute: () => {
      try {
        const cwd = process.cwd();
        return {
          prompt: 'pwd',
          command: 'pwd',
          output: cwd,
          timestamp: new Date(),
           type: 'command'
        };
      } catch (error) {
        return {
          prompt: 'pwd',
           type: 'command',
          command: 'pwd',
          output: '',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        };
      }
    }
  },
  {
    name: 'ls',
    description: 'List directory contents',
    execute: (args) => {
      try {
        const path = args[0] || '.';
        const items = readdirSync(path);
        
        const formatted = items.map(item => {
          try {
            const itemPath = join(path, item);
            const stats = statSync(itemPath);
            const isDir = stats.isDirectory();
            const size = stats.size;
            const modified = stats.mtime.toLocaleDateString();
            
            return `${isDir ? '📁' : '📄'} ${item.padEnd(20)} ${size.toString().padStart(8)} ${modified}`;
          } catch {
            return `❓ ${item}`;
          }
        }).join('\n');

        return {
            prompt: 'pwd',
           type: 'command',
          command: `ls ${args.join(' ')}`.trim(),
          output: formatted || 'No items found',
          timestamp: new Date()
        };
      } catch (error) {
        return {
          prompt: 'pwd',
          type: 'command',
          command: `ls ${args.join(' ')}`.trim(),
          output: '',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        };
      }
    }
  },
  {
    name: 'cat',
    description: 'Display file contents',
    execute: (args) => {
      if (args.length === 0) {
        return {
          command: 'cat',
          output: '',
          error: 'Usage: cat <filename>',
          timestamp: new Date(),
          prompt: 'cat',
          type: 'command',
        };
      }

      try {
        const content = readFileSync(args[0], 'utf8');
        return {
          prompt: `cat ${args.join(' ')}`,
          type: 'command',
          command: `cat ${args.join(' ')}`,
          output: content,
          timestamp: new Date()
        };
      } catch (error) {
        return {
          prompt: `cat ${args.join(' ')}`,
          type: 'command',
          command: `cat ${args.join(' ')}`,
          output: '',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        };
      }
    }
  },
  {
    name: 'echo',
    description: 'Display text',
    execute: (args) => ({
      prompt: `echo ${args.join(' ')}`,
      type: 'command',
      command: `echo ${args.join(' ')}`,
      output: args.join(' '),
      timestamp: new Date()
    })
  },
  {
    name: 'date',
    description: 'Show current date and time',
    execute: () => ({
      prompt: `date`,
      type: 'command',
      command: 'date',
      output: new Date().toString(),
      timestamp: new Date()
    })
  },
  {
    name: 'whoami',
    description: 'Show current user',
    execute: () => {
      try {
        const user = execSync('whoami', { encoding: 'utf8' }).trim();
        return {
          prompt: `whoami`,
          type: 'command',
          command: 'whoami',
          output: user,
          timestamp: new Date()
        };
      } catch (error) {
        return {
          prompt: `whoami`,
          type: 'command',
          command: 'whoami',
          output: process.env.USER || process.env.USERNAME || 'unknown',
          timestamp: new Date()
        };
      }
    }
  }
];