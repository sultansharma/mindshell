// src/internal/ai/providers/generateWithOllama.ts
import { execSync, spawn } from 'child_process';
import { InteractionResponse } from '../../../types/ai.js';
import { buildSystemPrompt } from '../system/systemPrompt.js';
import { parseAIResponse } from '../parser.js';
import path from 'path';
import fs from 'fs';
import { downloadTracker } from '../../../utils/downloadProgress.js';



const logFilePath = path.join(process.cwd(), 'debug.log');

export function debugLog(...args: any[]) {
  const logMessage = args.map(arg =>
    typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
  ).join(' ') + '\n';

  // Show in terminal (stderr won't break Ink layout)
  process.stderr.write(`[DEBUG] ${logMessage}`);

  // Also save to debug.log file
  fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] ${logMessage}`);
}

/**
 * Check if Ollama is installed and available
 */
async function isOllamaInstalled(): Promise<boolean> {
  try {
    execSync('ollama --version', { encoding: 'utf-8' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Download model if needed by running a dummy prompt (like Go version)
 */
async function isModelDownloaded(model: string): Promise<boolean> {
  try {
    // Run `ollama list` or equivalent command
    const output = execSync('ollama list', { encoding: 'utf-8' });
    return output.toLowerCase().includes(model.toLowerCase());
  } catch (e) {
    debugLog('Error checking if model is downloaded (ollama list failed):', e);
    // Command failed, assume model not found or ollama not installed
    return false;
  }
}

async function downloadModelIfNeeded(model: string): Promise<void> {
  // First check if Ollama is installed
  const ollamaInstalled = await isOllamaInstalled();
  if (!ollamaInstalled) {
    const errorMessage = 'Ollama is not installed. Please install Ollama first from https://ollama.ai';
    downloadTracker.errorDownload(errorMessage);
    throw new Error(errorMessage);
  }

  const downloaded = await isModelDownloaded(model);
  if (downloaded) {
    debugLog(`Model '${model}' already downloaded. Skipping download.`);
    return;
  }

  debugLog(`⏳ Downloading model '${model}'. This may take several minutes. Please wait...`);
  
  // Start progress tracking
  downloadTracker.startDownload(model);

  return new Promise((resolve, reject) => {
    // Use 'pipe' for stderr and explicitly write it, instead of 'inherit'
    const proc = spawn('ollama', ['run', model, 'Hi'], {
      stdio: ['pipe', 'inherit', 'pipe'] // stdin: pipe, stdout: inherit, stderr: pipe
    });

    let stderrBuffer = '';

    proc.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderrBuffer += chunk;
      
      // Parse progress from Ollama output
      const lines = chunk.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Try to extract percentage
        const percentageMatch = trimmedLine.match(/(\d+(?:\.\d+)?)%/);
        const percentage = percentageMatch ? parseFloat(percentageMatch[1]) : undefined;
        
        // Check for different types of progress messages
        if (trimmedLine.includes('pulling') || trimmedLine.includes('downloading')) {
          downloadTracker.updateProgress(`📥 ${trimmedLine}`, 'downloading', percentage);
        } else if (trimmedLine.includes('verifying')) {
          downloadTracker.updateProgress(`🔍 ${trimmedLine}`, 'verifying', percentage);
        } else if (trimmedLine.includes('writing') || trimmedLine.includes('saving')) {
          downloadTracker.updateProgress(`💾 ${trimmedLine}`, 'writing', percentage);
        } else if (trimmedLine.includes('complete') || trimmedLine.includes('done')) {
          downloadTracker.updateProgress(`✅ ${trimmedLine}`, 'complete', percentage);
        } else if (trimmedLine.includes('error') || trimmedLine.includes('failed')) {
          downloadTracker.updateProgress(`❌ ${trimmedLine}`, undefined, percentage);
        } else if (trimmedLine.includes('%') || trimmedLine.includes('progress')) {
          downloadTracker.updateProgress(`📊 ${trimmedLine}`, undefined, percentage);
        } else if (trimmedLine.includes('MB') || trimmedLine.includes('GB') || trimmedLine.includes('KB')) {
          // Show file size information
          downloadTracker.updateProgress(`📦 ${trimmedLine}`, undefined, percentage);
        } else if (trimmedLine.includes('layers') || trimmedLine.includes('manifest')) {
          downloadTracker.updateProgress(`🔧 ${trimmedLine}`, undefined, percentage);
        } else if (trimmedLine.includes('sha256') || trimmedLine.includes('digest')) {
          downloadTracker.updateProgress(`🔐 ${trimmedLine}`, undefined, percentage);
        } else if (trimmedLine.length > 0 && !trimmedLine.startsWith('[') && !trimmedLine.startsWith('time=')) {
          // Show other meaningful output, but filter out timestamp logs
          downloadTracker.updateProgress(`ℹ️  ${trimmedLine}`, undefined, percentage);
        }
      }
      
      // You can choose to print the chunk here to show progress
      // Note: This will print each line, not a dynamic progress bar
      process.stderr.write(chunk); // <<< This line will show the Ollama output
      debugLog(`[Ollama Download stderr] ${chunk.trim()}`);
    });

    proc.on('error', (err) => {
      debugLog('Download error:', err);
      downloadTracker.errorDownload(err.message);
      reject(err);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        debugLog(`✅ Model '${model}' downloaded successfully!`);
        downloadTracker.completeDownload();
        resolve();
      } else {
        const errorMessage = `Failed to download model '${model}': exit code ${code}. Details: ${stderrBuffer.trim()}`;
        debugLog(errorMessage);
        downloadTracker.errorDownload(errorMessage);
        reject(new Error(errorMessage));
      }
    });
  });
}

/**
 * Generate AI response using Ollama CLI (simplified like Go version)
 */
export async function generateWithOllama(
  prompt: string,
  context: Record<string, string>,
  model: string
): Promise<InteractionResponse> {
  const systemPrompt = buildSystemPrompt(context);
  const fullPrompt = `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`;

  await downloadModelIfNeeded(model); // Ensure model is downloaded before generation

  return new Promise((resolve, reject) => {
    debugLog(`🚀 Starting Ollama generation with model: ${model}`);
    debugLog(`📝 Full prompt length: ${fullPrompt.length} characters`);

    const proc = spawn('ollama', ['run', model, fullPrompt], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const timeoutId = setTimeout(() => {
      debugLog('⏰ Ollama CLI call timed out, killing process...');
      proc.kill('SIGTERM');
      reject(new Error('Ollama CLI call timed out'));
    }, 60000); // Increased timeout to 60 seconds for larger models

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      debugLog(`[stdout chunk] ${chunk.substring(0, 100)}${chunk.length > 100 ? '...' : ''}`);
    });

    proc.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      debugLog(`[stderr chunk] ${chunk}`);
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      debugLog('Ollama process error:', err);
      reject(new Error(`Ollama CLI error: ${err.message}`));
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      debugLog(`Ollama process closed with code: ${code}`);
      debugLog(`Raw stdout: "${stdout}"`);
      debugLog(`Raw stderr: "${stderr}"`);
      
      if (code !== 0) {
        debugLog('Ollama stderr:', stderr);
        reject(new Error(`Ollama CLI error: exit code ${code}, details: ${stderr}`));
        return;
      }
      
      const responseText = stdout.trim();
      if (!responseText) {
        debugLog('No response from Ollama CLI');
        reject(new Error('No response received from Ollama'));
        return;
      }
      
      debugLog('Response text length:', responseText.length);
      debugLog('Response preview:', responseText.substring(0, 500));
      
      try {
        const response = parseAIResponse(responseText);
        debugLog('Parsed response:', JSON.stringify(response, null, 2));
        resolve(response);
      } catch (parseError) {
        debugLog('Parse error:', parseError);
        // Fallback: create a basic response
        const fallbackResponse: InteractionResponse = {
          type: 'explanation',
          content: responseText,
          confidence: 3
        };
        debugLog('Using fallback response:', JSON.stringify(fallbackResponse, null, 2));
        resolve(fallbackResponse);
      }
    });
  });
}