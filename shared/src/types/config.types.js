/**
 * Configuration validation and type definitions
 */
import { z } from 'zod';
// Zod schemas for validation
export const ConfigSearchPathSchema = z.object({
    path: z.string().min(1),
    name: z.string().optional(),
    exclude: z.array(z.string()).optional(),
    maxDepth: z.number().positive().optional(),
});
export const IndexingConfigSchema = z.object({
    fileExtensions: z.array(z.string()).min(1),
    excludePatterns: z.array(z.string()),
    chunkSize: z.number().positive().max(10000),
    chunkOverlap: z.number().nonnegative(),
    followSymlinks: z.boolean(),
    respectGitignore: z.boolean(),
    maxFileSize: z.number().positive(),
});
export const SearchConfigSchema = z.object({
    maxResults: z.number().positive().max(100),
    contextLines: z.number().nonnegative(),
    minRelevanceScore: z.number().min(0).max(100),
    groupByRepo: z.boolean(),
});
export const AIConfigSchema = z.object({
    model: z.enum([
        'claude-3-haiku-20240307',
        'claude-3-5-sonnet-20241022',
        'claude-opus-4-20250514',
    ]),
    maxTokens: z.number().positive(),
    temperature: z.number().min(0).max(2),
    batchSize: z.number().positive(),
});
export const StorageConfigSchema = z.object({
    dbPath: z.string().min(1),
    enableWatcher: z.boolean(),
    watchDebounce: z.number().nonnegative(),
});
export const ServerConfigSchema = z.object({
    apiPort: z.number().int().min(1024).max(65535),
    webPort: z.number().int().min(1024).max(65535),
    nodeEnv: z.enum(['development', 'production', 'test']),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']),
});
export const AppConfigSchema = z.object({
    searchPaths: z.array(ConfigSearchPathSchema).min(1),
    indexing: IndexingConfigSchema,
    search: SearchConfigSchema,
    ai: AIConfigSchema,
    storage: StorageConfigSchema,
    server: ServerConfigSchema,
});
// Default configuration
export const DEFAULT_INDEXING_CONFIG = {
    fileExtensions: [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.py',
        '.java',
        '.go',
        '.rs',
        '.rb',
        '.php',
        '.cs',
    ],
    excludePatterns: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/__pycache__/**',
        '**/.pytest_cache/**',
        '**/target/**',
    ],
    chunkSize: 300,
    chunkOverlap: 50,
    followSymlinks: false,
    respectGitignore: true,
    maxFileSize: 1024 * 1024, // 1MB
};
export const DEFAULT_SEARCH_CONFIG = {
    maxResults: 20,
    contextLines: 10,
    minRelevanceScore: 50,
    groupByRepo: true,
};
export const DEFAULT_AI_CONFIG = {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
    temperature: 0.3,
    batchSize: 20,
};
export const DEFAULT_STORAGE_CONFIG = {
    dbPath: '~/.config/codescan/index.db',
    enableWatcher: true,
    watchDebounce: 500,
};
export const DEFAULT_SERVER_CONFIG = {
    apiPort: 3000,
    webPort: 3001,
    nodeEnv: 'development',
    logLevel: 'info',
};
//# sourceMappingURL=config.types.js.map