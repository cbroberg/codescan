import { exec } from 'child_process';
import { promisify } from 'util';
import { getLogger } from './logger.js';

const execAsync = promisify(exec);
const logger = getLogger();

/**
 * VS Code integration utilities
 */
export class VSCodeIntegration {
  /**
   * Generate VS Code file URL
   * Usage: vscode://file/absolute/path/to/file.ts:10:5
   * Line and column are optional (1-based)
   */
  public static generateFileUrl(filePath: string, line?: number, column?: number): string {
    let url = `vscode://file/${filePath}`;

    if (line !== undefined) {
      url += `:${line}`;

      if (column !== undefined) {
        url += `:${column}`;
      }
    }

    return url;
  }

  /**
   * Generate VS Code folder URL
   * Usage: vscode://folder/absolute/path/to/folder
   */
  public static generateFolderUrl(folderPath: string): string {
    return `vscode://folder/${folderPath}`;
  }

  /**
   * Open file in VS Code
   */
  public static async openFile(filePath: string, line?: number, column?: number): Promise<void> {
    try {
      const url = this.generateFileUrl(filePath, line, column);
      const command = process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;

      await execAsync(command);
      logger.info(`Opened in VS Code: ${filePath}${line ? `:${line}` : ''}`);
    } catch (error) {
      logger.error(`Failed to open file in VS Code: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Open folder in VS Code
   */
  public static async openFolder(folderPath: string): Promise<void> {
    try {
      const command = process.platform === 'darwin' ? `code "${folderPath}"` : `code "${folderPath}"`;

      await execAsync(command);
      logger.info(`Opened folder in VS Code: ${folderPath}`);
    } catch (error) {
      logger.error(`Failed to open folder in VS Code: ${folderPath}`, error);
      throw error;
    }
  }

  /**
   * Get VS Code command for opening file with preview
   * This is useful for generating links that VS Code will recognize
   */
  public static generateVsCodeCommand(filePath: string, line?: number, column?: number): string {
    // Format: code -g /path/to/file.ts:10:5
    let cmd = `code -g "${filePath}`;

    if (line !== undefined) {
      cmd += `:${line}`;

      if (column !== undefined) {
        cmd += `:${column}`;
      }
    }

    cmd += '"';
    return cmd;
  }

  /**
   * Check if VS Code is installed
   */
  public static async isVsCodeInstalled(): Promise<boolean> {
    try {
      const command = process.platform === 'darwin' ? 'which code' : 'where code';
      await execAsync(command);
      return true;
    } catch {
      return false;
    }
  }
}
