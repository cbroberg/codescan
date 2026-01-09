import { Command } from 'commander';
import { ApiClient } from '../client/api-client.js';
import { Formatters } from '../ui/formatters.js';
import ora from 'ora';
import Conf from 'conf';

const config = new Conf({ projectName: 'codescan' });
const apiClient = new ApiClient();

export const indexCommand = new Command()
  .name('index')
  .description('Build or rebuild the search index')
  .option('-a, --all', 'Index all configured directories')
  .option('-p, --path <path>', 'Index a specific directory')
  .action(async (options) => {
    try {
      // Check if API is running
      const isHealthy = await apiClient.healthCheck();
      if (!isHealthy) {
        console.log(
          Formatters.formatError(
            'CodeScan API is not running. Start it with: codescan server start',
          ),
        );
        process.exit(1);
      }

      const searchPaths = config.get('searchPaths', []) as any[];

      if (searchPaths.length === 0) {
        console.log(
          Formatters.formatError(
            'No search paths configured. Run "codescan init" first.',
          ),
        );
        process.exit(1);
      }

      let pathsToIndex = searchPaths;

      if (options.path) {
        pathsToIndex = searchPaths.filter((p) => p.path === options.path);

        if (pathsToIndex.length === 0) {
          console.log(
            Formatters.formatError(`Path not found in configuration: ${options.path}`),
          );
          process.exit(1);
        }
      }

      const spinner = ora('Starting indexing...').start();

      for (const searchPath of pathsToIndex) {
        spinner.text = `Indexing: ${searchPath.name || searchPath.path}`;

        try {
          await apiClient.buildIndex(searchPath.path, searchPath.name);

          // Poll for status updates
          let isIndexing = true;
          let lastUpdate = Date.now();

          while (isIndexing && Date.now() - lastUpdate < 300000) {
            // 5 min timeout
            const status = await apiClient.getIndexStatus();

            if (status.isIndexing && status.progress) {
              spinner.text = Formatters.formatProgress(status.progress);
            } else {
              isIndexing = false;
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          spinner.succeed(`✓ Indexed: ${searchPath.name || searchPath.path}`);
        } catch (error) {
          spinner.fail(
            `Failed to index: ${searchPath.name || searchPath.path}`,
          );
          console.error(error);
        }
      }

      // Show final status
      const finalStatus = await apiClient.getIndexStatus();
      console.log(
        Formatters.formatSuccess(
          `Indexing complete! ${finalStatus.totalFiles} files indexed.`,
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log(Formatters.formatError(`Indexing failed: ${message}`));
      process.exit(1);
    }
  });
