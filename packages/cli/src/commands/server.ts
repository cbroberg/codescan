import { Command } from 'commander';
import { spawn } from 'child_process';
import { Formatters } from '../ui/formatters.js';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const serverCommand = new Command()
  .name('server')
  .description('Manage the CodeScan API server')
  .command('start')
  .description('Start the CodeScan API server')
  .action(() => {
    console.log(Formatters.formatInfo('Starting CodeScan API server...'));

    // Find the API package root
    const apiRoot = path.resolve(__dirname, '../../..', 'packages/api');

    // Start the server using node dist/server.js
    const serverProcess = spawn('node', ['dist/server.js'], {
      cwd: apiRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'development',
      },
    });

    process.on('SIGINT', () => {
      console.log('\n' + Formatters.formatInfo('Stopping server...'));
      serverProcess.kill();
      process.exit(0);
    });

    serverProcess.on('error', (err) => {
      console.log(
        Formatters.formatError(
          `Failed to start server: ${err.message}\n\nMake sure the API package is built. Run: pnpm build`,
        ),
      );
      process.exit(1);
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.log(
          Formatters.formatError(
            `Server exited with code ${code}`,
          ),
        );
        process.exit(code);
      }
    });
  });
