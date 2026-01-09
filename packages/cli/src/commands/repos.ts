import { Command } from 'commander';
import { ApiClient } from '../client/api-client.js';
import { Formatters } from '../ui/formatters.js';

const apiClient = new ApiClient();

export const reposCommand = new Command()
  .name('repos')
  .description('List indexed repositories')
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

      const repos = await apiClient.getRepositories();

      console.log(Formatters.formatRepositories(repos));

      if (repos.length > 0) {
        console.log(Formatters.formatRepositoryTable(repos));
        console.log('');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log(Formatters.formatError(`Failed to get repositories: ${message}`));
      process.exit(1);
    }
  });
