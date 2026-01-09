import { Command } from 'commander';
import { Formatters } from '../ui/formatters.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

function getConfigPath(): string {
  return join(homedir(), '.config', 'codescan', 'config.json');
}

function loadConfig(): any {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return { searchPaths: [], indexing: {}, search: {} };
  }
  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content || '{}');
  } catch {
    return { searchPaths: [], indexing: {}, search: {} };
  }
}

function saveConfig(config: any): void {
  const configPath = getConfigPath();
  const dir = configPath.substring(0, configPath.lastIndexOf('/'));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export const initCommand = new Command()
  .name('init')
  .description('Initialize CodeScan with directories to search')
  .argument('[path]', 'Directory path to index')
  .argument('[name]', 'Friendly name for this directory')
  .action((path: string | undefined, name: string | undefined) => {
    console.log(Formatters.formatWelcome());

    const config = loadConfig();
    const searchPaths = config.searchPaths || [];

    // If arguments provided, add them directly
    if (path) {
      searchPaths.push({
        path,
        name: name || path,
        exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
      });

      config.searchPaths = searchPaths;

      // Set defaults if not exists
      if (!config.indexing || Object.keys(config.indexing).length === 0) {
        config.indexing = {
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
        };
      }

      if (!config.search || Object.keys(config.search).length === 0) {
        config.search = {
          maxResults: 20,
          minRelevance: 50,
        };
      }

      saveConfig(config);
      console.log(
        Formatters.formatSuccess(`\nAdded path: ${path}\nConfiguration saved!`),
      );
    } else {
      // Show help if no arguments
      console.log('\nUsage: codescan init <path> [name]');
      console.log('Example: codescan init ~/Apps "My Applications"');
      console.log('\nCurrent search paths:');
      if (searchPaths.length === 0) {
        console.log('  (none configured)');
      } else {
        searchPaths.forEach((p: any) => {
          console.log(`  - ${p.path} (${p.name})`);
        });
      }
    }

    process.exit(0);
  });
