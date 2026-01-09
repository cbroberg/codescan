import { getDatabaseManager } from '../storage/database.js';
import { getLogger } from '../../utils/logger.js';
import { KeywordMatch } from '@codescan/shared';

/**
 * Keyword-based search using SQLite FTS5
 * Fast pre-filtering stage before semantic analysis
 */
export class KeywordMatcher {
  private logger = getLogger();
  private maxResults: number;

  constructor(maxResults: number = 1000) {
    this.maxResults = maxResults;
  }

  /**
   * Search using FTS5
   */
  public search(
    query: string,
    filters?: {
      repositories?: string[];
      languages?: string[];
      technologies?: string[];
    },
  ): KeywordMatch[] {
    const db = getDatabaseManager();

    // Build FTS query
    const ftsQuery = this.buildFtsQuery(query);

    // Base search query
    let sql = `
      SELECT DISTINCT
        c.id as chunkId,
        CASE
          WHEN c.search_text LIKE ? THEN 100
          WHEN c.content LIKE ? THEN 80
          WHEN c.name LIKE ? THEN 90
          ELSE 50
        END as score,
        c.id
      FROM chunks c
      JOIN files f ON c.file_id = f.id
      WHERE
        (c.search_text LIKE ? OR c.content LIKE ? OR c.name LIKE ?)
    `;

    const params: any[] = [
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
    ];

    // Add repository filter
    if (filters?.repositories && filters.repositories.length > 0) {
      const placeholders = filters.repositories.map(() => '?').join(',');
      sql += ` AND c.repo_id IN (${placeholders})`;
      params.push(...filters.repositories);
    }

    // Add language filter
    if (filters?.languages && filters.languages.length > 0) {
      const placeholders = filters.languages.map(() => '?').join(',');
      sql += ` AND f.language IN (${placeholders})`;
      params.push(...filters.languages);
    }

    // Add technology filter
    if (filters?.technologies && filters.technologies.length > 0) {
      sql += ` AND EXISTS (
        SELECT 1 FROM technologies t
        WHERE t.repo_id = c.repo_id
        AND t.name IN (${filters.technologies.map(() => '?').join(',')})
      )`;
      params.push(...filters.technologies);
    }

    sql += ` ORDER BY score DESC LIMIT ?`;
    params.push(this.maxResults);

    try {
      const stmt = db.prepare(sql);
      const results = stmt.all(...params) as any[];

      return results.map((row) => ({
        chunkId: row.chunkId,
        score: row.score,
        matchedTerms: this.extractMatchedTerms(query),
      }));
    } catch (error) {
      this.logger.error('Keyword search failed', error);
      return [];
    }
  }

  /**
   * Search using FTS5 virtual table (faster)
   */
  public searchFTS(
    query: string,
    filters?: {
      repositories?: string[];
      languages?: string[];
    },
  ): KeywordMatch[] {
    const db = getDatabaseManager();

    // Build FTS query: OR-based for recall
    const terms = query
      .split(/\s+/)
      .filter((t) => t.length > 2)
      .join(' OR ');

    let sql = `
      SELECT DISTINCT
        cfts.chunk_id as chunkId,
        rank as score
      FROM chunks_fts cfts
      JOIN chunks c ON cfts.chunk_id = c.id
      JOIN files f ON c.file_id = f.id
      WHERE chunks_fts MATCH ?
    `;

    const params: any[] = [terms || query];

    // Add repository filter
    if (filters?.repositories && filters.repositories.length > 0) {
      const placeholders = filters.repositories.map(() => '?').join(',');
      sql += ` AND c.repo_id IN (${placeholders})`;
      params.push(...filters.repositories);
    }

    // Add language filter
    if (filters?.languages && filters.languages.length > 0) {
      const placeholders = filters.languages.map(() => '?').join(',');
      sql += ` AND f.language IN (${placeholders})`;
      params.push(...filters.languages);
    }

    sql += ` ORDER BY rank LIMIT ?`;
    params.push(this.maxResults);

    try {
      const stmt = db.prepare(sql);
      const results = stmt.all(...params) as any[];

      return results.map((row) => ({
        chunkId: row.chunkId,
        score: Math.abs(row.score) * 10, // FTS returns negative scores
        matchedTerms: this.extractMatchedTerms(query),
      }));
    } catch (error) {
      this.logger.warn('FTS search failed, falling back to LIKE search', error);
      return this.search(query, filters);
    }
  }

  /**
   * Get chunk details for ranking
   */
  public getChunkDetails(
    chunkIds: string[],
  ): Array<{
    id: string;
    name?: string;
    language: string;
    filePath: string;
    content: string;
    fileId: string;
    repositoryId: string;
  }> {
    if (chunkIds.length === 0) return [];

    const db = getDatabaseManager();
    const placeholders = chunkIds.map(() => '?').join(',');

    const sql = `
      SELECT
        c.id,
        c.name,
        f.language,
        f.path as filePath,
        c.content,
        c.file_id as fileId,
        c.repo_id as repositoryId
      FROM chunks c
      JOIN files f ON c.file_id = f.id
      WHERE c.id IN (${placeholders})
    `;

    try {
      const stmt = db.prepare(sql);
      return stmt.all(...chunkIds) as any[];
    } catch (error) {
      this.logger.error('Failed to get chunk details', error);
      return [];
    }
  }

  /**
   * Get repositories with relevant chunks
   */
  public getRelevantRepositories(chunkIds: string[]): string[] {
    if (chunkIds.length === 0) return [];

    const db = getDatabaseManager();
    const placeholders = chunkIds.map(() => '?').join(',');

    const sql = `
      SELECT DISTINCT c.repo_id
      FROM chunks c
      WHERE c.id IN (${placeholders})
    `;

    try {
      const stmt = db.prepare(sql);
      const results = stmt.all(...chunkIds) as any[];
      return results.map((r) => r.repo_id);
    } catch (error) {
      this.logger.error('Failed to get relevant repositories', error);
      return [];
    }
  }

  /**
   * Build FTS query from user query
   */
  private buildFtsQuery(query: string): string {
    // Simple FTS5 query building
    const terms = query
      .split(/\s+/)
      .filter((t) => t.length > 0)
      .map((t) => `"${t}"`)
      .join(' AND ');

    return terms || query;
  }

  /**
   * Extract matched terms from query
   */
  private extractMatchedTerms(query: string): string[] {
    return query
      .split(/\s+/)
      .filter((t) => t.length > 2)
      .map((t) => t.toLowerCase());
  }
}
