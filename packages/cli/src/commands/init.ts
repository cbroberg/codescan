import { Command } from 'commander';
import inquirer from 'inquirer';
import { Conf } from 'conf';
import { Formatters } from '../ui/formatters.js';

const config = new Conf({ projectName: 'codescan' });

export const initCommand = new Command()
  .name('init')
  .description('Initialize CodeScan with directories to search')
  .action(async () => {
    console.log(Formatters.formatWelcome());

    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'hasExisting',
        message: 'Do you have existing search paths configured?',
        default: false,
      },
    ]);

    const searchPaths = answers.hasExisting
      ? config.get('searchPaths', [])
      : [];

    const addMore = true;

    while (addMore) {
      const pathAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'path',
          message: 'Enter directory path to index (e.g., ~/projects)',
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Path cannot be empty';
            }
            return true;
          },
        },
        {
          type: 'input',
          name: 'name',
          message: 'Enter a friendly name for this directory (optional)',
          default: '',
        },
      ]);

      searchPaths.push({
        path: pathAnswer.path,
        name: pathAnswer.name || pathAnswer.path,
        exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
      });

      const another = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addAnother',
          message: 'Add another directory?',
          default: false,
        },
      ]);

      if (!another.addAnother) break;
    }

    // Save configuration
    config.set('searchPaths', searchPaths);

    // Save other default settings
    if (!config.has('indexing')) {
      config.set('indexing', {
        fileExtensions: [
          '.ts',
          '.tsx',
          '.js',
          '.jsx',
          '.py',
          '.java',
          '.go',
          '.rb',
        ],
        chunkSize: 300,
        respectGitignore: true,
      });
    }

    if (!config.has('search')) {
      config.set('search', {
        maxResults: 20,
        minRelevance: 50,
      });
    }

    console.log(
      Formatters.formatSuccess(
        `Configuration saved! Run "codescan index" to build the index.`,
      ),
    );
  });
