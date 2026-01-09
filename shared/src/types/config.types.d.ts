/**
 * Configuration validation and type definitions
 */
import { z } from 'zod';
export declare const ConfigSearchPathSchema: z.ZodObject<{
    path: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    maxDepth: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    path: string;
    name?: string | undefined;
    exclude?: string[] | undefined;
    maxDepth?: number | undefined;
}, {
    path: string;
    name?: string | undefined;
    exclude?: string[] | undefined;
    maxDepth?: number | undefined;
}>;
export declare const IndexingConfigSchema: z.ZodObject<{
    fileExtensions: z.ZodArray<z.ZodString, "many">;
    excludePatterns: z.ZodArray<z.ZodString, "many">;
    chunkSize: z.ZodNumber;
    chunkOverlap: z.ZodNumber;
    followSymlinks: z.ZodBoolean;
    respectGitignore: z.ZodBoolean;
    maxFileSize: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    fileExtensions: string[];
    excludePatterns: string[];
    chunkSize: number;
    chunkOverlap: number;
    followSymlinks: boolean;
    respectGitignore: boolean;
    maxFileSize: number;
}, {
    fileExtensions: string[];
    excludePatterns: string[];
    chunkSize: number;
    chunkOverlap: number;
    followSymlinks: boolean;
    respectGitignore: boolean;
    maxFileSize: number;
}>;
export declare const SearchConfigSchema: z.ZodObject<{
    maxResults: z.ZodNumber;
    contextLines: z.ZodNumber;
    minRelevanceScore: z.ZodNumber;
    groupByRepo: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    maxResults: number;
    contextLines: number;
    minRelevanceScore: number;
    groupByRepo: boolean;
}, {
    maxResults: number;
    contextLines: number;
    minRelevanceScore: number;
    groupByRepo: boolean;
}>;
export declare const AIConfigSchema: z.ZodObject<{
    model: z.ZodEnum<["claude-3-haiku-20240307", "claude-3-5-sonnet-20241022", "claude-opus-4-20250514"]>;
    maxTokens: z.ZodNumber;
    temperature: z.ZodNumber;
    batchSize: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    model: "claude-3-5-sonnet-20241022" | "claude-3-haiku-20240307" | "claude-opus-4-20250514";
    maxTokens: number;
    temperature: number;
    batchSize: number;
}, {
    model: "claude-3-5-sonnet-20241022" | "claude-3-haiku-20240307" | "claude-opus-4-20250514";
    maxTokens: number;
    temperature: number;
    batchSize: number;
}>;
export declare const StorageConfigSchema: z.ZodObject<{
    dbPath: z.ZodString;
    enableWatcher: z.ZodBoolean;
    watchDebounce: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    dbPath: string;
    enableWatcher: boolean;
    watchDebounce: number;
}, {
    dbPath: string;
    enableWatcher: boolean;
    watchDebounce: number;
}>;
export declare const ServerConfigSchema: z.ZodObject<{
    apiPort: z.ZodNumber;
    webPort: z.ZodNumber;
    nodeEnv: z.ZodEnum<["development", "production", "test"]>;
    logLevel: z.ZodEnum<["debug", "info", "warn", "error"]>;
}, "strip", z.ZodTypeAny, {
    apiPort: number;
    webPort: number;
    nodeEnv: "development" | "production" | "test";
    logLevel: "debug" | "info" | "warn" | "error";
}, {
    apiPort: number;
    webPort: number;
    nodeEnv: "development" | "production" | "test";
    logLevel: "debug" | "info" | "warn" | "error";
}>;
export declare const AppConfigSchema: z.ZodObject<{
    searchPaths: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        maxDepth: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        name?: string | undefined;
        exclude?: string[] | undefined;
        maxDepth?: number | undefined;
    }, {
        path: string;
        name?: string | undefined;
        exclude?: string[] | undefined;
        maxDepth?: number | undefined;
    }>, "many">;
    indexing: z.ZodObject<{
        fileExtensions: z.ZodArray<z.ZodString, "many">;
        excludePatterns: z.ZodArray<z.ZodString, "many">;
        chunkSize: z.ZodNumber;
        chunkOverlap: z.ZodNumber;
        followSymlinks: z.ZodBoolean;
        respectGitignore: z.ZodBoolean;
        maxFileSize: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        fileExtensions: string[];
        excludePatterns: string[];
        chunkSize: number;
        chunkOverlap: number;
        followSymlinks: boolean;
        respectGitignore: boolean;
        maxFileSize: number;
    }, {
        fileExtensions: string[];
        excludePatterns: string[];
        chunkSize: number;
        chunkOverlap: number;
        followSymlinks: boolean;
        respectGitignore: boolean;
        maxFileSize: number;
    }>;
    search: z.ZodObject<{
        maxResults: z.ZodNumber;
        contextLines: z.ZodNumber;
        minRelevanceScore: z.ZodNumber;
        groupByRepo: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        maxResults: number;
        contextLines: number;
        minRelevanceScore: number;
        groupByRepo: boolean;
    }, {
        maxResults: number;
        contextLines: number;
        minRelevanceScore: number;
        groupByRepo: boolean;
    }>;
    ai: z.ZodObject<{
        model: z.ZodEnum<["claude-3-haiku-20240307", "claude-3-5-sonnet-20241022", "claude-opus-4-20250514"]>;
        maxTokens: z.ZodNumber;
        temperature: z.ZodNumber;
        batchSize: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        model: "claude-3-5-sonnet-20241022" | "claude-3-haiku-20240307" | "claude-opus-4-20250514";
        maxTokens: number;
        temperature: number;
        batchSize: number;
    }, {
        model: "claude-3-5-sonnet-20241022" | "claude-3-haiku-20240307" | "claude-opus-4-20250514";
        maxTokens: number;
        temperature: number;
        batchSize: number;
    }>;
    storage: z.ZodObject<{
        dbPath: z.ZodString;
        enableWatcher: z.ZodBoolean;
        watchDebounce: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        dbPath: string;
        enableWatcher: boolean;
        watchDebounce: number;
    }, {
        dbPath: string;
        enableWatcher: boolean;
        watchDebounce: number;
    }>;
    server: z.ZodObject<{
        apiPort: z.ZodNumber;
        webPort: z.ZodNumber;
        nodeEnv: z.ZodEnum<["development", "production", "test"]>;
        logLevel: z.ZodEnum<["debug", "info", "warn", "error"]>;
    }, "strip", z.ZodTypeAny, {
        apiPort: number;
        webPort: number;
        nodeEnv: "development" | "production" | "test";
        logLevel: "debug" | "info" | "warn" | "error";
    }, {
        apiPort: number;
        webPort: number;
        nodeEnv: "development" | "production" | "test";
        logLevel: "debug" | "info" | "warn" | "error";
    }>;
}, "strip", z.ZodTypeAny, {
    search: {
        maxResults: number;
        contextLines: number;
        minRelevanceScore: number;
        groupByRepo: boolean;
    };
    searchPaths: {
        path: string;
        name?: string | undefined;
        exclude?: string[] | undefined;
        maxDepth?: number | undefined;
    }[];
    indexing: {
        fileExtensions: string[];
        excludePatterns: string[];
        chunkSize: number;
        chunkOverlap: number;
        followSymlinks: boolean;
        respectGitignore: boolean;
        maxFileSize: number;
    };
    ai: {
        model: "claude-3-5-sonnet-20241022" | "claude-3-haiku-20240307" | "claude-opus-4-20250514";
        maxTokens: number;
        temperature: number;
        batchSize: number;
    };
    storage: {
        dbPath: string;
        enableWatcher: boolean;
        watchDebounce: number;
    };
    server: {
        apiPort: number;
        webPort: number;
        nodeEnv: "development" | "production" | "test";
        logLevel: "debug" | "info" | "warn" | "error";
    };
}, {
    search: {
        maxResults: number;
        contextLines: number;
        minRelevanceScore: number;
        groupByRepo: boolean;
    };
    searchPaths: {
        path: string;
        name?: string | undefined;
        exclude?: string[] | undefined;
        maxDepth?: number | undefined;
    }[];
    indexing: {
        fileExtensions: string[];
        excludePatterns: string[];
        chunkSize: number;
        chunkOverlap: number;
        followSymlinks: boolean;
        respectGitignore: boolean;
        maxFileSize: number;
    };
    ai: {
        model: "claude-3-5-sonnet-20241022" | "claude-3-haiku-20240307" | "claude-opus-4-20250514";
        maxTokens: number;
        temperature: number;
        batchSize: number;
    };
    storage: {
        dbPath: string;
        enableWatcher: boolean;
        watchDebounce: number;
    };
    server: {
        apiPort: number;
        webPort: number;
        nodeEnv: "development" | "production" | "test";
        logLevel: "debug" | "info" | "warn" | "error";
    };
}>;
export type ConfigSearchPath = z.infer<typeof ConfigSearchPathSchema>;
export type IndexingConfig = z.infer<typeof IndexingConfigSchema>;
export type SearchConfig = z.infer<typeof SearchConfigSchema>;
export type AIConfig = z.infer<typeof AIConfigSchema>;
export type StorageConfig = z.infer<typeof StorageConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
export declare const DEFAULT_INDEXING_CONFIG: IndexingConfig;
export declare const DEFAULT_SEARCH_CONFIG: SearchConfig;
export declare const DEFAULT_AI_CONFIG: AIConfig;
export declare const DEFAULT_STORAGE_CONFIG: StorageConfig;
export declare const DEFAULT_SERVER_CONFIG: ServerConfig;
//# sourceMappingURL=config.types.d.ts.map