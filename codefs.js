#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

// Configuration
const DIR = path.join(os.homedir(), 'Apps');
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rb', '.php', '.phtml', '.md'];
const EXCLUDE_DIRS = ['node_modules', 'dist', '.venv', '.git', 'chunks'];

// Parse arguments
const keywords = process.argv.slice(2);

if (keywords.length === 0) {
  console.error('Usage: codefs <keyword1> [keyword2] [keyword3] ...');
  console.error('Example: codefs teams send notification');
  process.exit(1);
}

const start = Date.now();

try {
  // Build grep command with all keywords
  const grepArgs = [
    '-Ril',
    ...FILE_EXTENSIONS.map(ext => `--include="*${ext}"`),
    ...EXCLUDE_DIRS.map(dir => `--exclude-dir="${dir}"`),
    keywords[0],
    DIR
  ];

  // Execute first grep
  let result = execSync(`grep ${grepArgs.join(' ')}`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore']
  }).trim().split('\n').filter(Boolean);

  // AND logic for remaining keywords
  for (let i = 1; i < keywords.length; i++) {
    if (result.length === 0) break;

    // Filter files that contain the next keyword
    result = result.filter(file => {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        return new RegExp(keywords[i], 'i').test(content);
      } catch {
        return false;
      }
    });
  }

  // Print results
  if (result.length > 0) {
    result.forEach(file => console.log(file));
  } else {
    console.log('(no matches)');
  }

  // Print timing
  const duration = (Date.now() - start) / 1000;
  console.log('');
  console.log(`⏱️  Tid: ${duration.toFixed(2)} sekunder`);

} catch (error) {
  if (error.stderr && error.stderr.includes('No such file or directory')) {
    console.log('(no matches)');
    const duration = (Date.now() - start) / 1000;
    console.log('');
    console.log(`⏱️  Tid: ${duration.toFixed(2)} sekunder`);
  } else {
    console.error('Error:', error.message);
    process.exit(1);
  }
}
