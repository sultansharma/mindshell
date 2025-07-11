import React from 'react';
import { CLIShell } from '../cliShell.js';
import { CommandOutput } from '../types/cli.js';
import { Config } from '../types/config.js';

interface CLIReadyProps {
  config: Config | null;
  outputHistory: CommandOutput[] | [];
}

export const CLIReady: React.FC<CLIReadyProps> = ({ config, outputHistory }) => {
  return <CLIShell config={config} outputHis={outputHistory} />;
};
