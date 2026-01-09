import { KeywordMatcher } from './keyword-matcher.js';
import { SemanticMatcher } from './semantic-matcher.js';
import { SearchRanker } from './ranker.js';
import { ContextBuilder } from './context-builder.js';
import { getLogger } from '../../utils/logger.js';
import { getDatabaseManager } from '../storage/database.js';
import { SearchResult, SearchResultGroup, CodeChunk, Repository } from '@codescan/shared';

export interface SearchOptions {
  maxResults?: number;
  minRelevance?: number;
  technologies?: string[];
  repositories?: string[];
  languages?: string[];
}

/**
 * Main search engine orchestrating all search stages
 */
export class SearchEngine {
  private logger = getLogger();
  private keywordMatcher: KeywordMatcher;
  private semanticMatcher: SemanticMatcher;
  private ranker: SearchRanker;
  private contextBuilder: ContextBuilder;

  constructor() {
    this.keywordMatcher = new KeywordMatcher(1000);
    this.semanticMatcher = new SemanticMatcher(20);
    this.ranker = new SearchRanker();
    this.contextBuilder = new ContextBuilder(10);
  }

  /**
   * Execute semantic search
   */
  public async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      const maxResults = options.maxResults || 20;
      const minRelevance = options.minRelevance || 50;

      // Stage 1: Understand query intent
      this.logger.info(`Searching for: ${query}`);
      const intent = await this.semanticMatcher.understandQuery(query);
      this.ranker.adjustWeightsForIntent(intent.intent);

      // Stage 2: Keyword pre-filtering
      const keywordMatches = this.keywordMatcher.searchFTS(query, {
        repositories: options.repositories,
        languages: options.languages,
      });

      if (keywordMatches.length === 0) {
        this.logger.info('No keyword matches found');
        return {
          totalResults: 0,
          results: [],
          query,
          duration: Date.now() - startTime,
        };
      }

      this.logger.info(`Found ${keywordMatches.length} keyword candidates`);

      // Stage 3: Get chunk details for semantic analysis
      const chunkIds = keywordMatches.slice(0, 100).map((m) => m.chunkId);
      const chunkDetails = this.keywordMatcher.getChunkDetails(chunkIds);

      // Stage 4: Semantic matching
      const semanticMatches = await this.semanticMatcher.analyzeChunks(query, chunkDetails);

      if (semanticMatches.length === 0) {
        this.logger.info('No semantic matches above threshold');
        return {
          totalResults: 0,
          results: [],
          query,
          duration: Date.now() - startTime,
        };
      }

      this.logger.info(`Found ${semanticMatches.length} semantic matches`);

      // Stage 5: Scoring and ranking
      const db = getDatabaseManager();
      const rankedResults = this.ranker.rank(
        semanticMatches.map((sm) => {
          const chunk = chunkDetails.find((c) => c.id === sm.chunkId);
          const kwMatch = keywordMatches.find((km) => km.chunkId === sm.chunkId);

          return {
            chunkId: sm.chunkId,
            signals: {
              semanticScore: sm.relevanceScore,
              keywordScore: kwMatch?.score || 0,
              recencyScore: 50, // TODO: Get from file metadata
              simplicityScore: this.ranker.calculateSimplicityScore(
                (chunk?.content || '').split('\n').length,
              ),
              techMatchScore: options.technologies
                ? this.ranker.calculateTechMatchScore(
                    options.technologies,
                    sm.keyTechnologies || [],
                  )
                : 50,
            },
          };
        }),
      );

      // Filter by minimum relevance
      const topResults = rankedResults
        .filter((r) => r.finalScore >= minRelevance)
        .slice(0, maxResults);

      // Stage 6: Build context and aggregate by repository
      const grouped = this.groupByRepository(topResults, chunkDetails, db);

      return {
        totalResults: topResults.length,
        results: grouped,
        query,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Search failed', error);
      throw error;
    }
  }

  /**
   * Group results by repository with context
   */
  private groupByRepository(
    rankedResults: any[],
    chunkDetails: any[],
    db: any,
  ): SearchResultGroup[] {
    const grouped = new Map<string, SearchResultGroup>();

    for (const result of rankedResults) {
      const chunk = chunkDetails.find((c) => c.id === result.chunkId);
      if (!chunk) continue;

      // Get repository info
      const repoStmt = db.prepare('SELECT * FROM repositories WHERE id = ?');
      const repo = repoStmt.get(chunk.repositoryId) as any;

      if (!repo) continue;

      // Build full context
      const context = this.contextBuilder.buildContext(result.chunkId);

      const codeChunk: CodeChunk = {
        id: chunk.id,
        fileId: chunk.fileId,
        repositoryId: chunk.repositoryId,
        fileName: chunk.filePath.split('/').pop() || '',
        filePath: chunk.filePath,
        language: chunk.language,
        chunkType: 'generic',
        name: chunk.name,
        startLine: context?.chunk.startLine || 0,
        endLine: context?.chunk.endLine || 0,
        content: chunk.content,
        context: chunk.content,
        relevanceScore: result.finalScore,
        keyTechnologies: [],
      };

      const repository: Repository = {
        id: repo.id,
        name: repo.name,
        path: repo.path,
        type: repo.type,
        fileCount: repo.file_count,
        metadata: repo.metadata ? JSON.parse(repo.metadata) : {},
      };

      if (!grouped.has(repo.id)) {
        grouped.set(repo.id, {
          repository,
          matches: [],
          score: 0,
        });
      }

      const group = grouped.get(repo.id)!;
      group.matches.push(codeChunk);
      group.score = Math.max(group.score, result.finalScore);
    }

    return Array.from(grouped.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Get search history
   */
  public getHistory(limit: number = 20): Array<{
    id: string;
    query: string;
    timestamp: string;
    resultCount: number;
  }> {
    const db = getDatabaseManager();

    const sql = `
      SELECT id, query, timestamp, result_count
      FROM search_history
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    try {
      const stmt = db.prepare(sql);
      return stmt.all(limit) as any[];
    } catch (error) {
      this.logger.warn('Failed to get search history', error);
      return [];
    }
  }

  /**
   * Save search to history
   */
  public saveSearchHistory(query: string, resultCount: number): void {
    const db = getDatabaseManager();

    try {
      const sql = `
        INSERT INTO search_history (id, query, timestamp, result_count, duration_ms)
        VALUES (?, ?, ?, ?, ?)
      `;

      const stmt = db.prepare(sql);
      stmt.run(require('uuid').v4(), query, new Date().toISOString(), resultCount, 0);
    } catch (error) {
      this.logger.warn('Failed to save search history', error);
    }
  }
}
