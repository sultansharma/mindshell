// src/ai/contextAdapter.ts
import { ContextInfo } from '../../types/context.js';

export function toSimpleContext(raw: ContextInfo): Record<string, string> {
  return {
    os: raw.system.os,
    shell: raw.system.shell.split('/').pop() || raw.system.shell,
    language: raw.project.languages.join(', '),
    git_repo: raw.git.isRepo ? `${raw.git.branch || 'main'} branch` : 'not a git repo',
    package_managers: raw.tools.packageManagers.join(', '),
    python_env: raw.project.languages.includes('Python') ? 'yes' : 'no'
  };
}
