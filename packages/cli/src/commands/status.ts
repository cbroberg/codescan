import { Command } from 'commander';
import { ApiClient } from '../client/api-client.js';
import { Formatters } from '../ui/formatters.js';

const apiClient = new ApiClient();

export const statusCommand = new Command()
  .name('status')
  .description('Show indexing status and statistics')
  .action(async () => {
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

      const status = await apiClient.getIndexStatus();

      console.log('\n' + Formatters.formatInfo('CodeScan Status'));

      if (status.isIndexing && status.progress) {
        console.log(Formatters.formatProgress(status.progress));
      } else {
        console.log('\n  Index Status: Ready');
      }

      console.log(
        `
  Total Repositories: ${status.totalRepositories}
  Total Files: ${status.totalFiles}
  Total Chunks: ${status.totalChunks}
  Database Size: ${(status.databaseSize / 1024 / 1024).toFixed(2)} MB
      `,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log(Formatters.formatError(`Failed to get status: ${message}`));
      process.exit(1);
    }
  });
