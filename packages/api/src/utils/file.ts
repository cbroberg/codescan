import { homedir } from 'os';
import { resolve } from 'path';

/**
 * Expand ~ to home directory
 */
export function expandUser(path: string): string {
  if (path.startsWith('~/')) {
    return resolve(homedir(), path.slice(2));
  }
  if (path === '~') {
    return homedir();
  }
  return path;
}

/**
 * Normalize file path
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * Get file extension
 */
export function getFileExtension(path: string): string {
  const match = path.match(/\.[^.]+$/);
  return match ? match[0] : '';
}

/**
 * Get filename from path
 */
export function getFileName(path: string): string {
  return path.split('/').pop() || '';
}

/**
 * Get directory from path
 */
export function getDirectory(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '/';
}

/**
 * Check if file should be indexed
 */
export function shouldIndex(filePath: string, extensions: string[]): boolean {
  const ext = getFileExtension(filePath);
  return extensions.includes(ext);
}

/**
 * Check if path matches exclude patterns
 */
export function matchesExcludePattern(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    // Convert glob pattern to regex
    // ** = any number of directories
    // * = any characters except /
    // ? = single character except /
    let regexStr = pattern
      .replace(/\*\*/g, '###GLOBSTAR###') // Replace ** temporarily
      .replace(/\*/g, '[^/]*')             // * matches anything except /
      .replace(/###GLOBSTAR###/g, '.*')    // ** matches anything including /
      .replace(/\?/g, '[^/]');             // ? matches single char except /

    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(path);
  });
}

/**
 * Get relative path
 */
export function getRelativePath(filePath: string, basePath: string): string {
  const normalized = normalizePath(filePath);
  const normalizedBase = normalizePath(basePath);

  if (normalized.startsWith(normalizedBase)) {
    return normalized.slice(normalizedBase.length).replace(/^\//, '');
  }

  return normalized;
}
