#!/usr/bin/env node

import { main } from './src/cli.js';

// A consumer that stops reading, like `ts-starter list | head -1`, is not an error
process.stdout.on('error', (error) => {
  if (error.code !== 'EPIPE') {
    throw error;
  }
  process.exit(0);
});

process.exitCode = await main(process.argv.slice(2));
