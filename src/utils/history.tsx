import fs from 'fs';
import path from 'path';
import os from 'os';
import { CommandOutput } from '../types/cli.js';

const HISTORY_LIMIT = 30;
const COMMAND_HISTORY_LIMIT = 100;

/**
 * Traverse up from current working dir to find a parent folder containing `.mindshell`
 */
function findProjectRootWithMindshell(startDir = process.cwd()): string | null {
  let current = startDir;

  while (current !== path.parse(current).root) {
    const mindshellPath = path.join(current, '.mindshell');
    if (fs.existsSync(mindshellPath) && fs.lstatSync(mindshellPath).isDirectory()) {
      return mindshellPath;
    }
    current = path.dirname(current);
  }

  return null;
}

/**
 * Returns the path to the appropriate .mindshell file for this project (or global fallback)
 */
function getLocalFilePath(filename: string): string {
  const mindshellRoot = findProjectRootWithMindshell();
  const baseDir = mindshellRoot || path.join(os.homedir(), '.mindshell');

  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

  return path.join(baseDir, filename);
}

// ================= HISTORY ====================

function getHistoryFilePath() {
  return getLocalFilePath('history.json');
}

export function loadHistory(): CommandOutput[] {
  const filePath = getHistoryFilePath();
  if (!fs.existsSync(filePath)) return [];

  try {
    const json = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(json);
    return parsed.map((item: any) => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }));
  } catch (e) {
    return [];
  }
}


export function saveHistory(history: CommandOutput[]) {
  const filePath = getHistoryFilePath();
  const trimmed = history.slice(-HISTORY_LIMIT);
  fs.writeFileSync(filePath, JSON.stringify(trimmed, null, 2), 'utf8');
}

// ================= COMMAND HISTORY ====================

function getCommandHistoryFilePath() {
  return getLocalFilePath('commandhistory.json');
}

export function loadCommandHistory(): string[] {
  const filePath = getCommandHistoryFilePath();
  if (!fs.existsSync(filePath)) return [];

  try {
    const json = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(json);

    return Array.isArray(parsed) && parsed.every(item => typeof item === 'string') ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveCommandHistory(history: string[]) {
  const filePath = getCommandHistoryFilePath();
  const trimmed = history.slice(-COMMAND_HISTORY_LIMIT);
  fs.writeFileSync(filePath, JSON.stringify(trimmed, null, 2), 'utf8');
}

// ================= ASK HISTORY ====================

function getAskHistoryFilePath() {
  return getLocalFilePath('ask-history.json');
}

export function loadAskHistory(): string[] {
  const filePath = getAskHistoryFilePath();
  if (!fs.existsSync(filePath)) return [];

  try {
    const json = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(json);

    return Array.isArray(parsed) && parsed.every(item => typeof item === 'string') ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveAskHistory(history: string[]) {
  const filePath = getAskHistoryFilePath();
  const trimmed = history.slice(-COMMAND_HISTORY_LIMIT);
  fs.writeFileSync(filePath, JSON.stringify(trimmed, null, 2), 'utf8');
}

// ================= UTILITY ====================

/**
 * For debugging or UI — returns current active .mindshell directory path
 */
export function getActiveStorageDir(): string {
  return findProjectRootWithMindshell() || path.join(os.homedir(), '.mindshell');
}
