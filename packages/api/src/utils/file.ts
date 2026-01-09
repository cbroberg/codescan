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
    // Simple glob-like matching
    const regex = new RegExp(pattern.replace('*', '.*').replace('?', '.'));
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
