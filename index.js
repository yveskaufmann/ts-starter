#!/usr/bin/env node

import path from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { Plop, run } from "plop";

const __dirname = dirname(fileURLToPath(import.meta.url));

Plop.prepare({
  cwd: process.cwd(),
  configPath: path.join(__dirname, 'plopfile.js'),
  preload:  [],
  completion: null
}, env => Plop.execute(env, run));
