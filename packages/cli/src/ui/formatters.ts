import chalk from 'chalk';
import boxen from 'boxen';
import { SearchResult, Repository } from '@codescan/shared';

/**
 * Terminal formatting utilities
 */
export class Formatters {
  /**
   * Format search results for display
   */
  static formatSearchResults(results: SearchResult): string {
    if (results.totalResults === 0) {
      return chalk.yellow(`\n  No results found for: "${results.query}"`);
    }

    const lines: string[] = [
      chalk.bold(`\n  Search Results for: "${results.query}"`),
      chalk.dim(`  Found ${results.totalResults} matches in ${results.duration}ms\n`),
    ];

    results.results.forEach((group, groupIdx) => {
      lines.push(
        chalk.bold.cyan(`  📦 ${group.repository.name}`) +
          chalk.dim(` (${group.repository.path})`),
      );
      lines.push(chalk.dim(`     Score: ${group.score.toFixed(0)}/100`));

      group.matches.forEach((match, matchIdx) => {
        lines.push(
          chalk.green(`     ├─ ${match.filePath}:${match.startLine}`),
        );
        lines.push(
          chalk.blue(`        ${match.chunkType}${match.name ? ` - ${match.name}` : ''}`),
        );
        lines.push(
          chalk.dim(`        Relevance: ${match.relevanceScore}%`),
        );

        // Show snippet
        const snippet = match.content.substring(0, 150).replace(/\n/g, '\n        ');
        lines.push(chalk.gray(`        \`\`\`${match.language}`));
        lines.push(chalk.gray(`        ${snippet}...`));
        lines.push(chalk.gray(`        \`\`\``));

        if (matchIdx < group.matches.length - 1) {
          lines.push('');
        }
      });

      if (groupIdx < results.results.length - 1) {
        lines.push('');
      }
    });

    return lines.join('\n');
  }

  /**
   * Format single code chunk for display
   */
  static formatCodeChunk(chunk: any, highlight: boolean = true): string {
    const lines: string[] = [];

    lines.push(chalk.bold.cyan(`  File: ${chunk.filePath}`));
    lines.push(
      chalk.dim(`  Lines: ${chunk.startLine}-${chunk.endLine} (${chunk.language})`),
    );
    if (chunk.name) {
      lines.push(chalk.dim(`  Function/Class: ${chunk.name}`));
    }
    lines.push('');

    const codeLines = chunk.content.split('\n');
    codeLines.forEach((line: string, idx: number) => {
      const lineNum = chunk.startLine + idx;
      const lineStr = String(lineNum).padStart(4, ' ');

      if (highlight) {
        lines.push(chalk.dim(`  ${lineStr} │ `) + line);
      } else {
        lines.push(`  ${lineStr} │ ${line}`);
      }
    });

    return lines.join('\n');
  }

  /**
   * Format indexing progress
   */
  static formatProgress(progress: any): string {
    const percent = progress.totalFiles > 0 ? (progress.filesProcessed / progress.totalFiles) * 100 : 0;
    const barLength = 30;
    const filledLength = Math.floor((percent / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    return (
      chalk.bold(`  Indexing: ${progress.phase}\n`) +
      chalk.cyan(`  [${bar}] ${percent.toFixed(0)}%\n`) +
      chalk.dim(
        `  ${progress.filesProcessed}/${progress.totalFiles} files | ` +
          `${progress.filesPerSecond.toFixed(1)} files/sec | ` +
          `ETA: ${(progress.estimatedTimeRemaining / 60).toFixed(1)}m`,
      )
    );
  }

  /**
   * Format repository list
   */
  static formatRepositories(repos: Repository[]): string {
    if (repos.length === 0) {
      return chalk.yellow('\n  No repositories indexed yet. Run "codescan init" to add one.\n');
    }

    const lines: string[] = [chalk.bold('\n  Indexed Repositories:\n')];

    repos.forEach((repo, idx) => {
      const icon = idx === repos.length - 1 ? '└─' : '├─';
      lines.push(
        chalk.cyan(`  ${icon} ${repo.name}`),
      );
      lines.push(
        chalk.dim(`     Path: ${repo.path}`),
      );
      lines.push(
        chalk.dim(`     Files: ${repo.fileCount || 0}`),
      );
      if (repo.lastIndexed) {
        lines.push(
          chalk.dim(`     Last indexed: ${new Date(repo.lastIndexed).toLocaleString()}`),
        );
      }
      if (idx < repos.length - 1) {
        lines.push('');
      }
    });

    return lines.join('\n') + '\n';
  }

  /**
   * Format error message
   */
  static formatError(error: string): string {
    return boxen(
      chalk.red(`  ✗ ${error}`),
      {
        padding: 1,
        margin: 1,
        borderColor: 'red',
        borderStyle: 'round',
      },
    );
  }

  /**
   * Format success message
   */
  static formatSuccess(message: string): string {
    return boxen(
      chalk.green(`  ✓ ${message}`),
      {
        padding: 1,
        margin: 1,
        borderColor: 'green',
        borderStyle: 'round',
      },
    );
  }

  /**
   * Format info message
   */
  static formatInfo(message: string): string {
    return boxen(
      chalk.blue(`  ℹ ${message}`),
      {
        padding: 1,
        margin: 1,
        borderColor: 'blue',
        borderStyle: 'round',
      },
    );
  }

  /**
   * Format table for repositories
   */
  static formatRepositoryTable(repos: Repository[]): string {
    if (repos.length === 0) {
      return chalk.yellow('No repositories found');
    }

    const headers = ['Name', 'Path', 'Files', 'Last Indexed'];
    const rows = repos.map((repo) => [
      repo.name,
      repo.path.length > 40 ? repo.path.substring(0, 37) + '...' : repo.path,
      String(repo.fileCount || 0),
      repo.lastIndexed ? new Date(repo.lastIndexed).toLocaleDateString() : '-',
    ]);

    return this.formatTable(headers, rows);
  }

  /**
   * Simple table formatter
   */
  private static formatTable(headers: string[], rows: string[][]): string {
    // Calculate column widths
    const widths = headers.map((header, idx) => {
      const maxRowWidth = Math.max(
        ...rows.map((row) => (row[idx] || '').length),
      );
      return Math.max(header.length, maxRowWidth);
    });

    // Format headers
    const headerLine = headers
      .map((header, idx) => chalk.bold(header.padEnd(widths[idx])))
      .join('  ');

    // Format separator
    const separator = widths.map((w) => '─'.repeat(w)).join('  ');

    // Format rows
    const rowLines = rows.map((row) =>
      row.map((cell, idx) => (cell || '').padEnd(widths[idx])).join('  '),
    );

    return [chalk.cyan(headerLine), chalk.cyan(separator), ...rowLines].join('\n');
  }

  /**
   * Format chat message
   */
  static formatChatMessage(role: 'user' | 'assistant', content: string): string {
    if (role === 'user') {
      return chalk.blue(`You: ${content}`);
    } else {
      return chalk.green(`Assistant: ${content}`);
    }
  }

  /**
   * Format welcome message
   */
  static formatWelcome(): string {
    const message = `
    ${chalk.bold.cyan('CodeScan')} - AI-powered code search
    ${chalk.dim('Type "help" for available commands')}
  `;

    return boxen(message, {
      padding: 1,
      margin: 1,
      borderColor: 'cyan',
      borderStyle: 'round',
    });
  }

  /**
   * Format help message
   */
  static formatHelp(): string {
    const help = `
${chalk.bold('Available Commands:')}

${chalk.cyan('init')}              Initialize CodeScan with directories to search
${chalk.cyan('index')}             Build or rebuild the search index
${chalk.cyan('search <query>')}    Search for code (semantic search)
${chalk.cyan('chat')}              Start interactive chat mode
${chalk.cyan('status')}            Show indexing status
${chalk.cyan('repos')}             List indexed repositories
${chalk.cyan('clear')}             Clear the index
${chalk.cyan('help')}              Show this help message
${chalk.cyan('exit')}              Exit CodeScan

${chalk.bold('Examples:')}

${chalk.dim('$ codescan search "Teams SDK notifications"')}
${chalk.dim('$ codescan search "authentication" --tech react')}
${chalk.dim('$ codescan chat')}
    `;

    return help;
  }
}
