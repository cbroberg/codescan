/**
 * API request/response types shared between frontend and backend
 */

// ====== Indexing Types ======

export interface IndexingProgress {
  phase: 'scanning' | 'parsing' | 'chunking' | 'storing';
  filesProcessed: number;
  totalFiles: number;
  filesPerSecond: number;
  estimatedTimeRemaining: number; // seconds
  currentFile?: string;
}

export interface IndexingStatus {
  isIndexing: boolean;
  progress?: IndexingProgress;
  lastIndexTime?: string;
  totalRepositories: number;
  totalFiles: number;
  totalChunks: number;
  databaseSize: number; // bytes
}

export interface IndexBuildRequest {
  repositoryIds?: string[];
  force?: boolean; // Force reindex even if up-to-date
}

export interface IndexBuildResponse {
  success: boolean;
  repositoryId?: string;
  filesIndexed: number;
  chunksCreated: number;
  duration: number; // milliseconds
  error?: string;
}

// ====== Repository Types ======

export interface Repository {
  id: string;
  name: string;
  path: string;
  type: 'git' | 'directory';
  lastIndexed?: string; // ISO datetime
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

// ====== Search Types ======

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
    from?: string; // ISO date
    to?: string; // ISO date
  };
  minRelevance?: number; // 0-100
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
  context: string; // Code before and after
  relevanceScore: number; // 0-100
  relevanceReason?: string;
  keyTechnologies?: string[];
}

export interface SearchResult {
  totalResults: number;
  results: SearchResultGroup[];
  query: string;
  duration: number; // milliseconds
}

export interface SearchResultGroup {
  repository: Repository;
  matches: CodeChunk[];
  score: number; // Repository-level relevance
}

export interface SearchHistoryEntry {
  id: string;
  query: string;
  timestamp: string;
  resultCount: number;
}

// ====== Chat Types ======

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

// ====== Configuration Types ======

export interface ConfigSearchPath {
  path: string;
  name?: string;
  exclude?: string[];
  maxDepth?: number;
}

export interface IndexingConfig {
  fileExtensions: string[];
  excludePatterns: string[];
  chunkSize: number;
  chunkOverlap: number;
  followSymlinks: boolean;
  respectGitignore: boolean;
  maxFileSize: number; // bytes
}

export interface SearchConfig {
  maxResults: number;
  contextLines: number;
  minRelevanceScore: number;
  groupByRepo: boolean;
}

export interface AIConfig {
  model: 'claude-3-haiku-20240307' | 'claude-3-5-sonnet-20241022' | 'claude-opus-4-20250514';
  maxTokens: number;
  temperature: number;
  batchSize: number;
}

export interface StorageConfig {
  dbPath: string;
  enableWatcher: boolean;
  watchDebounce: number; // ms
}

export interface ServerConfig {
  apiPort: number;
  webPort: number;
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface AppConfig {
  searchPaths: ConfigSearchPath[];
  indexing: IndexingConfig;
  search: SearchConfig;
  ai: AIConfig;
  storage: StorageConfig;
  server: ServerConfig;
}

// ====== Error Types ======

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

// ====== API Response Wrapper ======

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
