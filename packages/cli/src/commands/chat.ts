import { Command } from 'commander';
import { ApiClient } from '../client/api-client.js';
import { Formatters } from '../ui/formatters.js';
import inquirer from 'inquirer';

const apiClient = new ApiClient();

export const chatCommand = new Command()
  .name('chat')
  .description('Start interactive chat mode')
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

      // Create a new chat session
      const sessionId = await apiClient.createChatSession();

      console.log(Formatters.formatWelcome());
      console.log('\n' + Formatters.formatInfo('Type "exit" to quit, "help" for commands\n'));

      // Chat loop
      let continueChat = true;

      while (continueChat) {
        const answer = await inquirer.prompt([
          {
            type: 'input',
            name: 'message',
            message: 'You',
            prefix: '→',
          },
        ]);

        const message = answer.message.trim();

        if (message.toLowerCase() === 'exit') {
          console.log(Formatters.formatSuccess('Goodbye!'));
          continueChat = false;
          break;
        }

        if (message.toLowerCase() === 'help') {
          console.log('\n' + Formatters.formatHelp() + '\n');
          continue;
        }

        if (message.length === 0) {
          continue;
        }

        try {
          // Send message to chat API
          const response = await apiClient.sendChatMessage(sessionId, message);

          // Display assistant response
          console.log(
            '\n' + Formatters.formatChatMessage('assistant', response.response.content) + '\n',
          );

          // Display search results if available
          if (response.searchResults) {
            const { searchResults } = response;
            console.log(Formatters.formatSearchResults(searchResults));
            console.log('');
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.log('\n' + Formatters.formatError(`Chat error: ${errorMsg}\n`));
        }
      }

      // Clean up session
      await apiClient.deleteChatSession(sessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log(Formatters.formatError(`Chat failed: ${message}`));
      process.exit(1);
    }
  });
