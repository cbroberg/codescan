#!/usr/bin/env node

import('../dist/index.js').catch(err => {
  console.error('Failed to start CodeScan CLI:', err);
  process.exit(1);
});
