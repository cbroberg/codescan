import { getDatabaseManager } from './database.js';
import { Repository } from '@codescan/shared';
import { getLogger } from '../../utils/logger.js';

/**
 * Repository operations
 */
export class RepositoryManager {
  private logger = getLogger();

  /**
   * Get all repositories
   */
  public getAll(): Repository[] {
    const db = getDatabaseManager();
    const stmt = db.prepare(`
      SELECT id, name, path, type, last_indexed, file_count, metadata
      FROM repositories
      ORDER BY name
    `);

    const rows = stmt.all() as any[];
    return rows.map((row) => this.mapToRepository(row));
  }

  /**
   * Get repository by ID
   */
  public getById(id: string): Repository | null {
    const db = getDatabaseManager();
    const stmt = db.prepare(`
      SELECT id, name, path, type, last_indexed, file_count, metadata
      FROM repositories
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    return row ? this.mapToRepository(row) : null;
  }

  /**
   * Get repository by path
   */
  public getByPath(path: string): Repository | null {
    const db = getDatabaseManager();
    const stmt = db.prepare(`
      SELECT id, name, path, type, last_indexed, file_count, metadata
      FROM repositories
      WHERE path = ?
    `);

    const row = stmt.get(path) as any;
    return row ? this.mapToRepository(row) : null;
  }

  /**
   * Create repository
   */
  public create(repo: Omit<Repository, 'id'>): Repository {
    const db = getDatabaseManager();
    const id = require('uuid').v4();

    const stmt = db.prepare(`
      INSERT INTO repositories (id, name, path, type, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, repo.name, repo.path, repo.type, JSON.stringify(repo.metadata || {}));

    return { ...repo, id };
  }

  /**
   * Update repository
   */
  public update(id: string, updates: Partial<Repository>): Repository | null {
    const db = getDatabaseManager();

    const stmt = db.prepare(`
      UPDATE repositories
      SET name = COALESCE(?, name),
          path = COALESCE(?, path),
          type = COALESCE(?, type),
          metadata = COALESCE(?, metadata)
      WHERE id = ?
    `);

    stmt.run(
      updates.name || null,
      updates.path || null,
      updates.type || null,
      updates.metadata ? JSON.stringify(updates.metadata) : null,
      id,
    );

    return this.getById(id);
  }

  /**
   * Delete repository (and all related data)
   */
  public delete(id: string): boolean {
    const db = getDatabaseManager();

    try {
      db.transaction(() => {
        // Delete cascades to files, chunks, technologies
        const stmt = db.prepare('DELETE FROM repositories WHERE id = ?');
        stmt.run(id);
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to delete repository ${id}`, error);
      return false;
    }
  }

  /**
   * Get repository with statistics
   */
  public getStats(repositoryId: string): { fileCount: number; chunkCount: number; lineCount: number } {
    const db = getDatabaseManager();

    const fileCount = (db.prepare('SELECT COUNT(*) as count FROM files WHERE repo_id = ?').get(repositoryId) as any)
      .count;

    const chunkCount = (db.prepare('SELECT COUNT(*) as count FROM chunks WHERE repo_id = ?').get(repositoryId) as any)
      .count;

    const lineCount = (
      db.prepare('SELECT SUM(end_line - start_line) as count FROM chunks WHERE repo_id = ?').get(repositoryId) as any
    ).count || 0;

    return { fileCount, chunkCount, lineCount };
  }

  /**
   * Get technologies used in repository
   */
  public getTechnologies(repositoryId: string): Array<{ name: string; version?: string; category: string }> {
    const db = getDatabaseManager();

    const stmt = db.prepare(`
      SELECT DISTINCT name, version, category
      FROM technologies
      WHERE repo_id = ?
      ORDER BY name
    `);

    return stmt.all(repositoryId) as any[];
  }

  /**
   * Map database row to Repository
   */
  private mapToRepository(row: any): Repository {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      type: row.type,
      lastIndexed: row.last_indexed,
      fileCount: row.file_count,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    };
  }
}

// Singleton instance
let repoManager: RepositoryManager | null = null;

export function getRepositoryManager(): RepositoryManager {
  if (!repoManager) {
    repoManager = new RepositoryManager();
  }
  return repoManager;
}
