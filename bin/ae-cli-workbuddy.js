#!/usr/bin/env node
import os from 'node:os';
import path from 'node:path';

process.env.AE_CLI_CONFIG_DIR = path.join(os.homedir(), '.ae-cli-workbuddy');

await import('../dist/index.js');
