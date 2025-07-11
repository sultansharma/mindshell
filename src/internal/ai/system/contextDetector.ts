
import { readdir, readFile, stat, writeFile, mkdir } from 'fs/promises';
import { join, basename, dirname } from 'path';

import { existsSync } from 'fs';
import os from 'os';
import crypto from 'crypto';
import { CachedContext, ContextInfo, DynamicContext, FileSystemContext, GitInfo, LocationInfo, ProjectInfo, SystemInfo, ToolsInfo } from '../../../types/context.js';
import { execSync } from 'child_process';

// Type definitions (same as before)


const CACHE_VERSION = '1.0.0';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MINDSHELL_DIR = '.mindshell';

/**
 * Get project hash for cache invalidation
 * Only checks key files that would affect project detection 
 */
async function getProjectHash(projectPath: string): Promise<string> {
  const keyFiles = [
    'package.json', 'tsconfig.json', 'go.mod', 'Cargo.toml', 
    'requirements.txt', 'pyproject.toml', 'pom.xml', 'build.gradle',
    'composer.json', 'pubspec.yaml', 'Gemfile', 'mix.exs'
  ];
  
  const hash = crypto.createHash('md5');
  
  try {
    for (const file of keyFiles) {
      const filePath = join(projectPath, file);
      if (existsSync(filePath)) {
        const content = await readFile(filePath, 'utf8');
        hash.update(`${file}:${content}`);
      }
    }
    
    // Also include directory structure (just names, not content)
    const items = await readdir(projectPath);
    hash.update(items.sort().join(','));
    
  } catch (error) {
    // If we can't hash, use timestamp
    hash.update(Date.now().toString());
  }
  
  return hash.digest('hex');
}

/**
 * Get cache file path for a project
 */
function getCacheFilePath(projectPath: string): string {
  const folderName = basename(projectPath);
  const parentHash = crypto.createHash('md5').update(projectPath).digest('hex').slice(0, 8);
  const cacheDir = join(projectPath, MINDSHELL_DIR);
  return join(cacheDir, `context-${folderName}-${parentHash}.json`);
}

/**
 * Load cached context if valid
 */
async function loadCachedContext(projectPath: string): Promise<CachedContext | null> {
  try {
    const cacheFile = getCacheFilePath(projectPath);
    
    if (!existsSync(cacheFile)) {
      return null;
    }
    
    const cached: CachedContext = JSON.parse(await readFile(cacheFile, 'utf8'));
    
    // Version check
    if (cached.version !== CACHE_VERSION) {
      return null;
    }
    
    // TTL check
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      return null;
    }
    
    // Project hash check (detect if key files changed)
    const currentHash = await getProjectHash(projectPath);
    if (cached.projectHash !== currentHash) {
      return null;
    }
    
    return cached;
    
  } catch (error) {
    return null;
  }
}

/**
 * Save context to cache
 */
async function saveCachedContext(
  projectPath: string, 
  staticc: CachedContext['staticc'], 
  projectHash: string
): Promise<void> {
  try {
    const cacheFile = getCacheFilePath(projectPath);
    const cacheDir = dirname(cacheFile);
    
    // Ensure cache directory exists
    await mkdir(cacheDir, { recursive: true });
    
    const cached: CachedContext = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      projectHash,
      staticc
    };
    
    await writeFile(cacheFile, JSON.stringify(cached, null, 2), 'utf8');
    
  } catch (error) {
    // Fail silently - caching is optional
    console.warn('Failed to save context cache:', error);
  }
}

/**
 * Get static context (cached when possible)
 */
async function getStaticContext(projectPath: string): Promise<CachedContext['staticc']> {
  // Try to load from cache first
  const cached = await loadCachedContext(projectPath);
  if (cached) {
    return cached.staticc;
  }
  
  // Cache miss - generate fresh context
  console.log('🔄 Generating fresh context (cache miss)...');
  
  const [system, tools, project] = await Promise.all([
    getSystemInfo(),
    detectTools(),
    detectProject(projectPath)
  ]);
  
  const staticContext: CachedContext['staticc'] = {
    system,
    tools,
    project
  };
  
  // Save to cache for next time
  const projectHash = await getProjectHash(projectPath);
  await saveCachedContext(projectPath, staticContext, projectHash);
  
  return staticContext;
}

/**
 * Get dynamic context (always fresh)
 */
async function getDynamicContext(projectPath: string): Promise<DynamicContext> {
  const [location, git, files] = await Promise.all([
    getLocationInfo(projectPath),
    getGitInfo(projectPath),
    getFileSystemContext(projectPath)
  ]);
  
  return { location, git, files };
}

async function getFileSystemContext(projectPath: string): Promise<FileSystemContext> {
  const context: FileSystemContext = {
    fileCount: 0,
    directories: [],
    importantFiles: []
  };

  try {
    const items = await readdir(projectPath, { withFileTypes: true });
    
    // Count files and get directories
    for (const item of items) {
      if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
        context.directories.push(item.name);
      } else if (item.isFile()) {
        context.fileCount++;
        
        // Track important files
        const importantPatterns = [
          'README', 'LICENSE', 'CHANGELOG',
          '.env', '.gitignore',
          'Dockerfile', 'docker-compose',
          'Makefile', 'justfile', 'taskfile'
        ];
        
        if (importantPatterns.some(pattern => 
          item.name.toLowerCase().includes(pattern.toLowerCase())
        )) {
          context.importantFiles.push(item.name);
        }
      }
    }

  } catch (error) {
    context.error = (error as Error).message;
  }

  return context;
}


/**
 * Main optimized context detection
 */
export async function detectContextOptimized(targetPath: string = process.cwd()): Promise<ContextInfo> {
  const [staticContext, dynamicContext] = await Promise.all([
    getStaticContext(targetPath),
    getDynamicContext(targetPath)
  ]);
  
  return {
    system: staticContext.system,
    tools: staticContext.tools,
    project: staticContext.project,
    location: dynamicContext.location,
    git: dynamicContext.git,
    files: dynamicContext.files
  };
}

/**
 * Quick context that only gets the minimal dynamic info
 * For very fast responses when you just need git status + basic info
 */
export async function getQuickDynamicContext(targetPath: string = process.cwd()): Promise<string> {
  const cached = await loadCachedContext(targetPath);
  
  if (!cached) {
    // No cache available, do minimal detection
    const [git, location] = await Promise.all([
      getGitInfo(targetPath),
      getLocationInfo(targetPath)
    ]);
    
    return `DIR: ${location.name} | git:${git.branch || 'no-git'} ${git.hasChanges ? 'modified' : 'clean'}`;
  }
  
  // Use cached static info + fresh dynamic info
  const [git, location] = await Promise.all([
    getGitInfo(targetPath),
    getLocationInfo(targetPath)
  ]);
  
  const parts: string[] = [];
  
  // From cache
  parts.push(`SYS: ${cached.staticc.system.os}/${cached.staticc.system.arch}`);
  if (cached.staticc.project.languages.length) {
    parts.push(`LANG: ${cached.staticc.project.languages.join(', ')}`);
  }
  if (cached.staticc.project.packageManager) {
    parts.push(`PKG: ${cached.staticc.project.packageManager}`);
  }
  
  // Fresh dynamic info
  parts.push(`DIR: ${location.name}`);
  if (git.isRepo) {
    const gitStatus = [`git:${git.branch || 'unknown'}`];
    if (git.hasChanges) gitStatus.push('modified');
    if (git.hasUntracked) gitStatus.push('untracked');
    parts.push(gitStatus.join(' '));
  }
  
  return parts.join(' | ');
}

/**
 * Force cache refresh
 */
export async function refreshContextCache(targetPath: string = process.cwd()): Promise<void> {
  const cacheFile = getCacheFilePath(targetPath);
  
  try {
    if (existsSync(cacheFile)) {
      const { unlink } = await import('fs/promises');
      await unlink(cacheFile);
    }
    
    // Regenerate cache
    await getStaticContext(targetPath);
    console.log('✅ Context cache refreshed');
    
  } catch (error) {
    console.error('❌ Failed to refresh cache:', error);
  }
}

// Re-export the existing functions with caching optimizations
async function getSystemInfo(): Promise<SystemInfo> {
  return {
    os: os.platform(),
    arch: os.arch(),
    release: os.release(),
    shell: process.env.SHELL || process.env.ComSpec || 'unknown',
    user: os.userInfo().username,
    node: process.version,
    cwd: process.cwd()
  };
}

async function getLocationInfo(targetPath: string): Promise<LocationInfo> {
  const location: LocationInfo = {
    path: targetPath,
    name: basename(targetPath),
    parent: basename(dirname(targetPath)),
    depth: targetPath.split('/').length - 1
  };

  const pathLower = targetPath.toLowerCase();
  if (pathLower.includes('projects') || pathLower.includes('workspace') || pathLower.includes('dev')) {
    location.context = 'development';
  } else if (pathLower.includes('desktop')) {
    location.context = 'desktop';
  } else if (pathLower.includes('documents')) {
    location.context = 'documents';
  }

  return location;
}

// [Include the existing detectProject, detectTools, getGitInfo, and getFileSystemContext functions here]
// They remain the same but are only called when cache is invalid

/**
 * Example usage with performance timing
 */
export async function getContextForCLI(path?: string): Promise<{
  full: ContextInfo;
  compact: string;
  timing: { total: number; cached: boolean };
}> {
  const start = Date.now();
  const targetPath = path || process.cwd();
  
  // Check if we have valid cache
  const cached = await loadCachedContext(targetPath);
  const hasCachedStatic = !!cached;
  
  const context = await detectContextOptimized(targetPath);
  const timing = {
    total: Date.now() - start,
    cached: hasCachedStatic
  };
  
  return {
    full: context,
    compact: formatForLLM(context),
    timing
  };
}

function formatForLLM(context: ContextInfo): string {
  const parts: string[] = [];
  
  parts.push(`SYS: ${context.system.os}/${context.system.arch} ${context.system.shell.split('/').pop()} node${context.system.node}`);
  parts.push(`DIR: ${context.location.name} (${context.location.context || 'unknown'})`);
  
  if (context.project.languages.length) {
    parts.push(`LANG: ${context.project.languages.join(', ')}`);
  }
  if (context.project.frameworks.length) {
    parts.push(`FRAMEWORK: ${context.project.frameworks.join(', ')}`);
  }
  if (context.project.packageManager) {
    parts.push(`PKG: ${context.project.packageManager}`);
  }
  
  const relevantTools = [
    ...context.tools.devTools.filter(t => ['git', 'docker', 'kubectl'].includes(t)),
    ...context.tools.languages.slice(0, 3)
  ];
  if (relevantTools.length) {
    parts.push(`TOOLS: ${relevantTools.join(', ')}`);
  }
  
  if (context.git.isRepo) {
    const gitStatus = [`git:${context.git.branch || 'unknown'}`];
    if (context.git.hasChanges) gitStatus.push('modified');
    if (context.git.hasUntracked) gitStatus.push('untracked');
    parts.push(gitStatus.join(' '));
  }
  
  const flags: string[] = [];
  if (context.project.hasTests) flags.push('tests');
  if (context.project.hasDocker) flags.push('docker');
  if (context.project.hasCI) flags.push('ci');
  if (flags.length) parts.push(`FLAGS: ${flags.join(', ')}`);
  
  return parts.join(' | ');
}





/**
 * Detect project type and configuration
 */
async function detectProject(projectPath: string): Promise<ProjectInfo> {
  const project: ProjectInfo = {
    type: 'unknown',
    languages: [],
    frameworks: [],
    packageManager: null,
    buildTool: null,
    hasTests: false,
    hasDocker: false,
    hasCI: false
  };

  try {
    const files = await readdir(projectPath);
    const fileSet = new Set(files);

    // Package managers (priority order)
    if (fileSet.has('pnpm-lock.yaml')) project.packageManager = 'pnpm';
    else if (fileSet.has('yarn.lock')) project.packageManager = 'yarn';
    else if (fileSet.has('package-lock.json')) project.packageManager = 'npm';
    else if (fileSet.has('bun.lockb')) project.packageManager = 'bun';

    // Language and framework detection
    const detectionRules = [
      // JavaScript/TypeScript
      { 
        files: ['package.json'], 
        lang: 'JavaScript', 
        check: async () => {
          try {
            const pkg = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf8'));
            if (pkg.dependencies?.typescript || pkg.devDependencies?.typescript) {
              project.languages.push('TypeScript');
            }
            
            // Framework detection from package.json
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            if (deps.next) project.frameworks.push('Next.js');
            if (deps.react) project.frameworks.push('React');
            if (deps.vue) project.frameworks.push('Vue');
            if (deps.svelte) project.frameworks.push('Svelte');
            if (deps.express) project.frameworks.push('Express');
            if (deps['@nestjs/core']) project.frameworks.push('NestJS');
            if (deps['@angular/core']) project.frameworks.push('Angular');
            if (deps.fastify) project.frameworks.push('Fastify');
            
            return true;
          } catch (e) { 
            return false; 
          }
        }
      },
      
      // Configuration files
      { files: ['next.config.js', 'next.config.mjs', 'next.config.ts'], lang: 'TypeScript', framework: 'Next.js' },
      { files: ['tsconfig.json'], lang: 'TypeScript' },
      { files: ['angular.json'], framework: 'Angular' },
      { files: ['nuxt.config.js', 'nuxt.config.ts'], framework: 'Nuxt' },
      { files: ['gatsby-config.js'], framework: 'Gatsby' },
      { files: ['remix.config.js'], framework: 'Remix' },
      { files: ['vite.config.js', 'vite.config.ts'], buildTool: 'Vite' },
      { files: ['webpack.config.js'], buildTool: 'Webpack' },
      { files: ['rollup.config.js'], buildTool: 'Rollup' },
      { files: ['esbuild.config.js'], buildTool: 'ESBuild' },
      
      // Other languages
      { files: ['go.mod'], lang: 'Go' },
      { files: ['main.go'], lang: 'Go' },
      { files: ['Cargo.toml'], lang: 'Rust' },
      { files: ['src/main.rs'], lang: 'Rust' },
      { files: ['requirements.txt', 'pyproject.toml'], lang: 'Python' },
      { files: ['main.py', 'app.py'], lang: 'Python' },
      { files: ['Pipfile'], lang: 'Python', framework: 'Pipenv' },
      { files: ['poetry.lock'], lang: 'Python', framework: 'Poetry' },
      { files: ['pom.xml'], lang: 'Java', buildTool: 'Maven' },
      { files: ['build.gradle', 'build.gradle.kts'], lang: 'Java/Kotlin', buildTool: 'Gradle' },
      { files: ['composer.json'], lang: 'PHP' },
      { files: ['pubspec.yaml'], lang: 'Dart', framework: 'Flutter' },
      { files: ['Gemfile'], lang: 'Ruby' },
      { files: ['mix.exs'], lang: 'Elixir' },
      { files: ['deno.json'], lang: 'TypeScript', framework: 'Deno' },
      { files: ['bun.config.js'], lang: 'TypeScript', framework: 'Bun' }
    ];

    for (const rule of detectionRules) {
      const hasFile = rule.files.some(f => fileSet.has(f));
      if (hasFile) {
        if (rule.lang && !project.languages.includes(rule.lang)) {
          project.languages.push(rule.lang);
        }
        if (rule.framework && !project.frameworks.includes(rule.framework)) {
          project.frameworks.push(rule.framework);
        }
        if (rule.buildTool) project.buildTool = rule.buildTool;
        if (rule.check) await rule.check();
      }
    }

    // Docker detection
    project.hasDocker = fileSet.has('Dockerfile') || fileSet.has('docker-compose.yml') || fileSet.has('docker-compose.yaml');

    // CI/CD detection
    project.hasCI = fileSet.has('.github') || fileSet.has('.gitlab-ci.yml') || 
                   fileSet.has('.travis.yml') || fileSet.has('jenkins') ||
                   fileSet.has('.circleci') || fileSet.has('azure-pipelines.yml');

    // Test detection
    const testIndicators = files.filter(f => 
      f.includes('test') || f.includes('spec') || f.includes('__tests__') ||
      ['jest.config.js', 'jest.config.ts', 'vitest.config.js', 'vitest.config.ts', 
       'cypress.json', 'cypress.config.js', 'playwright.config.js', 'playwright.config.ts'].includes(f)
    );
    project.hasTests = testIndicators.length > 0;

    // Determine project type
    if (project.frameworks.length > 0) {
      project.type = 'web-application';
    } else if (project.languages.includes('Go') || project.languages.includes('Rust')) {
      project.type = 'system-application';
    } else if (project.languages.includes('Python')) {
      project.type = 'script/application';
    } else if (fileSet.has('package.json')) {
      try {
        const pkg = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf8'));
        project.type = pkg.main || pkg.bin ? 'library/cli' : 'application';
      } catch (e) {
        project.type = 'application';
      }
    }

  } catch (error) {
    project.error = (error as Error).message;
  }

  return project;
}

/**
 * Detect available development tools
 */
async function detectTools(): Promise<ToolsInfo> {
  const tools: ToolsInfo = {
    packageManagers: [],
    languages: [],
    devTools: [],
    databases: []
  };

  const checks = [
    // Package managers
    { cmd: 'npm', category: 'packageManagers' as keyof ToolsInfo },
    { cmd: 'yarn', category: 'packageManagers' as keyof ToolsInfo },
    { cmd: 'pnpm', category: 'packageManagers' as keyof ToolsInfo },
    { cmd: 'bun', category: 'packageManagers' as keyof ToolsInfo },
    
    // Languages/Runtimes
    { cmd: 'node', category: 'languages' as keyof ToolsInfo },
    { cmd: 'python', category: 'languages' as keyof ToolsInfo },
    { cmd: 'python3', category: 'languages' as keyof ToolsInfo },
    { cmd: 'go', category: 'languages' as keyof ToolsInfo },
    { cmd: 'rustc', category: 'languages' as keyof ToolsInfo },
    { cmd: 'java', category: 'languages' as keyof ToolsInfo },
    { cmd: 'php', category: 'languages' as keyof ToolsInfo },
    { cmd: 'ruby', category: 'languages' as keyof ToolsInfo },
    { cmd: 'deno', category: 'languages' as keyof ToolsInfo },
    
    // Development tools
    { cmd: 'git', category: 'devTools' as keyof ToolsInfo },
    { cmd: 'docker', category: 'devTools' as keyof ToolsInfo },
    { cmd: 'kubectl', category: 'devTools' as keyof ToolsInfo },
    { cmd: 'terraform', category: 'devTools' as keyof ToolsInfo },
    { cmd: 'ansible', category: 'devTools' as keyof ToolsInfo },
    { cmd: 'helm', category: 'devTools' as keyof ToolsInfo },
    
    // Databases
    { cmd: 'mysql', category: 'databases' as keyof ToolsInfo },
    { cmd: 'psql', category: 'databases' as keyof ToolsInfo },
    { cmd: 'mongo', category: 'databases' as keyof ToolsInfo },
    { cmd: 'redis-cli', category: 'databases' as keyof ToolsInfo }
  ];

  for (const { cmd, category } of checks) {
    try {
      execSync(`which ${cmd} 2>/dev/null || where ${cmd} 2>nul`, { 
        stdio: 'ignore', 
        timeout: 1000 
      });
      (tools[category] as string[]).push(cmd);
    } catch (e) {
      // Tool not available
    }
  }

  return tools;
}

/**
 * Get Git repository information
 */
async function getGitInfo(projectPath: string): Promise<GitInfo> {
  const git: GitInfo = { isRepo: false };

  try {
    // Check if it's a git repo
    execSync('git rev-parse --is-inside-work-tree', { 
      stdio: 'ignore', 
      cwd: projectPath,
      timeout: 2000 
    });
    
    git.isRepo = true;
    git.branch = execSync('git branch --show-current', { 
      encoding: 'utf8', 
      cwd: projectPath,
      timeout: 2000 
    }).trim();
    
    // Check for uncommitted changes
    try {
      execSync('git diff --quiet', { stdio: 'ignore', cwd: projectPath, timeout: 2000 });
      git.hasChanges = false;
    } catch (e) {
      git.hasChanges = true;
    }
    
    // Check for untracked files
    const untracked = execSync('git ls-files --others --exclude-standard', { 
      encoding: 'utf8', 
      cwd: projectPath,
      timeout: 2000 
    }).trim();
    git.hasUntracked = untracked.length > 0;
    
    // Get last commit info
    try {
      const lastCommit = execSync('git log -1 --pretty=format:"%h %s" 2>/dev/null', { 
        encoding: 'utf8', 
        cwd: projectPath,
        timeout: 2000 
      }).trim();
      if (lastCommit) git.lastCommit = lastCommit;
    } catch (e) {
      // No commits yet
    }

  } catch (error) {
    // Not a git repo or git not available
  }

  return git;
}