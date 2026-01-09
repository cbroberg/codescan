import { readdirSync, statSync, readFileSync } from 'fs';
import { resolve, relative, extname } from 'path';
import ignore, { Ignore } from 'ignore';
import { getLogger } from '../../utils/logger.js';
import { matchesExcludePattern } from '../../utils/file.js';
import { createHash } from 'crypto';

export interface ScannedFile {
  path: string;
  relativePath: string;
  extension: string;
  language?: string;
  size: number;
  hash: string;
}

export interface ScanResult {
  files: ScannedFile[];
  totalFiles: number;
  skippedFiles: number;
}

export class FileScanner {
  private logger = getLogger();
  private supportedExtensions: Set<string>;
  private excludePatterns: string[];
  private maxFileSize: number;
  private gitignoreCache: Map<string, Ignore> = new Map();

  constructor(
    supportedExtensions: string[],
    excludePatterns: string[],
    maxFileSize: number = 1024 * 1024, // 1MB default
  ) {
    this.supportedExtensions = new Set(supportedExtensions);
    this.excludePatterns = excludePatterns;
    this.maxFileSize = maxFileSize;
  }

  /**
   * Scan directory recursively and find all supported files
   */
  public scan(basePath: string, respectGitignore: boolean = true): ScanResult {
    const files: ScannedFile[] = [];
    let skippedFiles = 0;

    const scanDirectory = (currentPath: string, depth: number = 0) => {
      try {
        const entries = readdirSync(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = resolve(currentPath, entry.name);
          const relativePath = relative(basePath, fullPath);

          // Check if path should be skipped
          if (this.shouldSkip(fullPath, basePath, respectGitignore)) {
            skippedFiles++;
            continue;
          }

          if (entry.isDirectory()) {
            // Recursively scan subdirectories
            scanDirectory(fullPath, depth + 1);
          } else if (entry.isFile()) {
            const scannedFile = this.scanFile(fullPath, basePath);
            if (scannedFile) {
              files.push(scannedFile);
            } else {
              skippedFiles++;
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to scan directory ${currentPath}`, error);
      }
    };

    scanDirectory(basePath);

    return {
      files,
      totalFiles: files.length,
      skippedFiles,
    };
  }

  /**
   * Scan a single file
   */
  private scanFile(filePath: string, basePath: string): ScannedFile | null {
    try {
      const stat = statSync(filePath);

      // Check file size
      if (stat.size > this.maxFileSize) {
        this.logger.debug(`Skipping file (too large): ${filePath}`);
        return null;
      }

      const extension = extname(filePath);

      // Check if extension is supported
      if (!this.supportedExtensions.has(extension)) {
        return null;
      }

      // Check for binary files (heuristic)
      if (this.isBinaryFile(filePath)) {
        this.logger.debug(`Skipping binary file: ${filePath}`);
        return null;
      }

      const relativePath = relative(basePath, filePath);
      const content = readFileSync(filePath, 'utf-8');
      const hash = this.calculateHash(content);

      return {
        path: filePath,
        relativePath,
        extension,
        language: this.getLanguage(extension),
        size: stat.size,
        hash,
      };
    } catch (error) {
      this.logger.warn(`Failed to scan file ${filePath}`, error);
      return null;
    }
  }

  /**
   * Check if path should be skipped
   */
  private shouldSkip(fullPath: string, basePath: string, respectGitignore: boolean): boolean {
    const relativePath = relative(basePath, fullPath);

    // Check exclude patterns
    if (matchesExcludePattern(relativePath, this.excludePatterns)) {
      return true;
    }

    // Check .gitignore if enabled
    if (respectGitignore) {
      const ig = this.loadGitignore(basePath);
      if (ig.ignores(relativePath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Load .gitignore rules for a directory
   */
  private loadGitignore(basePath: string): Ignore {
    if (this.gitignoreCache.has(basePath)) {
      return this.gitignoreCache.get(basePath)!;
    }

    const ig = ignore();

    try {
      const gitignorePath = resolve(basePath, '.gitignore');
      const content = readFileSync(gitignorePath, 'utf-8');
      ig.add(content);
    } catch {
      // .gitignore doesn't exist, that's fine
    }

    this.gitignoreCache.set(basePath, ig);
    return ig;
  }

  /**
   * Check if file is binary
   */
  private isBinaryFile(filePath: string): boolean {
    // Binary extensions
    const binaryExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.pdf',
      '.zip',
      '.tar',
      '.gz',
      '.exe',
      '.dll',
      '.so',
      '.dylib',
      '.bin',
      '.wasm',
    ];

    const ext = extname(filePath).toLowerCase();
    if (binaryExtensions.includes(ext)) {
      return true;
    }

    // Check file content (first 512 bytes)
    try {
      const buffer = Buffer.alloc(512);
      const fd = require('fs').openSync(filePath, 'r');
      const bytesRead = require('fs').readSync(fd, buffer, 0, 512);
      require('fs').closeSync(fd);

      // Check for null bytes (common in binary files)
      for (let i = 0; i < bytesRead; i++) {
        if (buffer[i] === 0) {
          return true;
        }
      }
    } catch {
      // Assume text file if we can't read
    }

    return false;
  }

  /**
   * Calculate file hash
   */
  private calculateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get language from file extension
   */
  private getLanguage(extension: string): string {
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.hpp': 'cpp',
      '.kt': 'kotlin',
      '.swift': 'swift',
      '.m': 'objc',
      '.scala': 'scala',
      '.sh': 'bash',
      '.bash': 'bash',
      '.zsh': 'zsh',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml',
      '.html': 'html',
      '.htm': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sql': 'sql',
      '.md': 'markdown',
    };

    return languageMap[extension] || 'text';
  }
}
