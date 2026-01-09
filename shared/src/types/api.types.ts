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
// (Re-exported from config.types.ts which has Zod validation)
export type {
  ConfigSearchPath,
  IndexingConfig,
  SearchConfig,
  AIConfig,
  StorageConfig,
  ServerConfig,
  AppConfig,
} from './config.types.js';

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
