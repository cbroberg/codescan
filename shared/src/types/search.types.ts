/**
 * Internal search engine types
 */

export interface ParsedFile {
  id: string;
  path: string;
  language: string;
  content: string;
  ast?: ASTNode;
  imports?: string[];
  exports?: string[];
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

export interface ASTNode {
  type: string;
  name?: string;
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
  children?: ASTNode[];
  metadata?: Record<string, unknown>;
}

export interface Chunk {
  id: string;
  fileId: string;
  repositoryId: string;
  type: 'function' | 'class' | 'module' | 'generic';
  name?: string;
  startLine: number;
  endLine: number;
  content: string;
  context: string;
  metadata?: {
    complexity?: number;
    dependencies?: string[];
    imports?: string[];
    [key: string]: unknown;
  };
}

export interface KeywordMatch {
  chunkId: string;
  score: number;
  matchedTerms: string[];
}

export interface SemanticMatch {
  chunkId: string;
  relevanceScore: number;
  reason: string;
  keyTechnologies?: string[];
}

export interface RankedResult {
  chunkId: string;
  finalScore: number;
  signals: {
    semanticScore: number;
    keywordScore: number;
    recencyScore: number;
    simplicityScore: number;
    techMatchScore: number;
  };
}

export interface SearchContext {
  query: string;
  keywords: string[];
  technologies: string[];
  languages: string[];
  repositories: string[];
}
