#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import { CLI } from './cli.js';

// Render the CLI app
const { clear } = render(React.createElement(CLI));

// Handle process exit
process.on('SIGINT', () => {
  clear();
  process.exit(0);
});

process.on('SIGTERM', () => {
  clear();
  process.exit(0);
});