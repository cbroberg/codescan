import { Command } from 'commander';
import { ApiClient } from '../client/api-client.js';
import { Formatters } from '../ui/formatters.js';
import ora from 'ora';
import inquirer from 'inquirer';

const apiClient = new ApiClient();

export const searchCommand = new Command()
  .name('search')
  .description('Search for code (semantic search)')
  .argument('<query>', 'Search query')
  .option('-t, --tech <technologies>', 'Filter by technology (comma-separated)')
  .option('-r, --repo <repositories>', 'Filter by repository (comma-separated)')
  .option('-l, --lang <languages>', 'Filter by language (comma-separated)')
  .option('-m, --max <results>', 'Maximum number of results', '20')
  .action(async (query, options) => {
    try {
      const isHealthy = await apiClient.healthCheck();
      if (!isHealthy) {
        console.log(
          Formatters.formatError(
            'CodeScan API is not running. Start it with: codescan server start',
          ),
        );
        process.exit(1);
      }

      const spinner = ora('Searching...').start();

      const searchOptions = {
        maxResults: parseInt(options.max),
        filters: {
          technologies: options.tech ? options.tech.split(',').map((t) => t.trim()) : undefined,
          repositories: options.repo ? options.repo.split(',').map((r) => r.trim()) : undefined,
          languages: options.lang ? options.lang.split(',').map((l) => l.trim()) : undefined,
        },
      };

      const results = await apiClient.search(query, searchOptions);

      spinner.stop();

      console.log(Formatters.formatSearchResults(results));

      // Ask if user wants to see full code of any result
      if (results.totalResults > 0) {
        const showMore = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'viewDetails',
            message: 'View details of a specific result?',
            default: false,
          },
        ]);

        if (showMore.viewDetails) {
          // Build list of results for selection
          const choices = results.results.flatMap((group) =>
            group.matches.map((match) => ({
              name: `${group.repository.name} - ${match.filePath}:${match.startLine}`,
              value: match,
            })),
          );

          const selected = await inquirer.prompt([
            {
              type: 'list',
              name: 'chunk',
              message: 'Select a result to view:',
              choices,
            },
          ]);

          console.log('\n' + Formatters.formatCodeChunk(selected.chunk));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log(Formatters.formatError(`Search failed: ${message}`));
      process.exit(1);
    }
  });
