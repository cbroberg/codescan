#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { indexCommand } from './commands/index.js';
import { searchCommand } from './commands/search.js';
import { chatCommand } from './commands/chat.js';
import { statusCommand } from './commands/status.js';
import { reposCommand } from './commands/repos.js';
import { serverCommand } from './commands/server.js';
import { Formatters } from './ui/formatters.js';
import chalk from 'chalk';

const program = new Command();

program
  .name('codescan')
  .description('AI-powered semantic code search tool')
  .version('0.1.0')
  .helpOption('-h, --help', 'Display help for command');

// Add commands
program.addCommand(initCommand);
program.addCommand(serverCommand);
program.addCommand(indexCommand);
program.addCommand(searchCommand);
program.addCommand(chatCommand);
program.addCommand(statusCommand);
program.addCommand(reposCommand);

// Help command
program.command('help').description('Show help information').action(() => {
  console.log(Formatters.formatHelp());
});

// Default action
if (process.argv.length < 3) {
  console.log(Formatters.formatWelcome());
  program.outputHelp();
}

program.parse(process.argv);
