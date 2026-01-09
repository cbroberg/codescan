/**
 * API request/response types shared between frontend and backend
 */
export interface IndexingProgress {
    phase: 'scanning' | 'parsing' | 'chunking' | 'storing';
    filesProcessed: number;
    totalFiles: number;
    filesPerSecond: number;
    estimatedTimeRemaining: number;
    currentFile?: string;
}
export interface IndexingStatus {
    isIndexing: boolean;
    progress?: IndexingProgress;
    lastIndexTime?: string;
    totalRepositories: number;
    totalFiles: number;
    totalChunks: number;
    databaseSize: number;
}
export interface IndexBuildRequest {
    repositoryIds?: string[];
    force?: boolean;
}
export interface IndexBuildResponse {
    success: boolean;
    repositoryId?: string;
    filesIndexed: number;
    chunksCreated: number;
    duration: number;
    error?: string;
}
export interface Repository {
    id: string;
    name: string;
    path: string;
    type: 'git' | 'directory';
    lastIndexed?: string;
    fileCount: number;
    metadata: {
        technologies?: string[];
        description?: string;
        gitUrl?: string;
    };
}
export interface RepositoryDetails extends Repository {
    files: number;
    chunks: number;
    lineOfCode: number;
    technologies: TechnologyInfo[];
}
export interface TechnologyInfo {
    name: string;
    version?: string;
    category: 'dependency' | 'devDependency' | 'framework' | 'other';
}
export interface SearchRequest {
    query: string;
    filters?: SearchFilters;
    maxResults?: number;
}
export interface SearchFilters {
    technologies?: string[];
    repositories?: string[];
    languages?: string[];
    dateRange?: {
        from?: string;
        to?: string;
    };
    minRelevance?: number;
}
export interface CodeChunk {
    id: string;
    fileId: string;
    repositoryId: string;
    fileName: string;
    filePath: string;
    language: string;
    chunkType: 'function' | 'class' | 'module' | 'generic';
    name?: string;
    startLine: number;
    endLine: number;
    content: string;
    context: string;
    relevanceScore: number;
    relevanceReason?: string;
    keyTechnologies?: string[];
}
export interface SearchResult {
    totalResults: number;
    results: SearchResultGroup[];
    query: string;
    duration: number;
}
export interface SearchResultGroup {
    repository: Repository;
    matches: CodeChunk[];
    score: number;
}
export interface SearchHistoryEntry {
    id: string;
    query: string;
    timestamp: string;
    resultCount: number;
}
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    type: 'text' | 'search_results' | 'error';
    searchResults?: SearchResult;
}
export interface ChatSession {
    id: string;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
}
export interface ChatRequest {
    message: string;
    sessionId?: string;
    context?: {
        previousResults?: SearchResult;
    };
}
export interface ChatResponse {
    sessionId: string;
    message: ChatMessage;
    searchTriggered?: boolean;
    searchResults?: SearchResult;
}
export type { ConfigSearchPath, IndexingConfig, SearchConfig, AIConfig, StorageConfig, ServerConfig, AppConfig, } from './config.types.js';
export interface ErrorResponse {
    error: string;
    code?: string;
    details?: Record<string, unknown>;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}
//# sourceMappingURL=api.types.d.ts.map