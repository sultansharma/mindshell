export interface SystemInfo {
  os: string;
  arch: string;
  release: string;
  shell: string;
  user: string;
  node: string;
  cwd: string;
}

export interface LocationInfo {
  path: string;
  name: string;
  parent: string;
  depth: number;
  context?: 'development' | 'desktop' | 'documents';
}

export interface ProjectInfo {
  type: string;
  languages: string[];
  frameworks: string[];
  packageManager: string | null;
  buildTool: string | null;
  hasTests: boolean;
  hasDocker: boolean;
  hasCI: boolean;
  error?: string;
}

export interface ToolsInfo {
  packageManagers: string[];
  languages: string[];
  devTools: string[];
  databases: string[];
}

export interface GitInfo {
  isRepo: boolean;
  branch?: string;
  hasChanges?: boolean;
  hasUntracked?: boolean;
  lastCommit?: string;
}

export interface FileSystemContext {
  fileCount: number;
  directories: string[];
  importantFiles: string[];
  error?: string;
}

export interface ContextInfo {
  system: SystemInfo;
  location: LocationInfo;
  project: ProjectInfo;
  tools: ToolsInfo;
  git: GitInfo;
  files: FileSystemContext;
}

// Cache structure
export interface CachedContext {
  version: string;
  timestamp: number;
  projectHash: string; // Hash of key project files for invalidation
  staticc: {
    system: SystemInfo;
    tools: ToolsInfo;
    project: ProjectInfo; // Static project info (languages, frameworks, etc.)
  };
}

export interface DynamicContext {
  location: LocationInfo;
  git: GitInfo;
  files: FileSystemContext;
}