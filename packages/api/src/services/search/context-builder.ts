import { getDatabaseManager } from '../storage/database.js';
import { getLogger } from '../../utils/logger.js';

export interface ChunkContext {
  chunk: {
    id: string;
    name?: string;
    type: string;
    startLine: number;
    endLine: number;
    content: string;
  };
  file: {
    id: string;
    path: string;
    language: string;
    size: number;
    imports?: string[];
    exports?: string[];
  };
  repository: {
    id: string;
    name: string;
    path: string;
    technologies?: string[];
  };
  context: {
    before: string; // Code before the chunk
    after: string; // Code after the chunk
  };
}

/**
 * Builds rich context around code chunks
 */
export class ContextBuilder {
  private logger = getLogger();
  private contextLines: number;

  constructor(contextLines: number = 10) {
    this.contextLines = contextLines;
  }

  /**
   * Build full context for a chunk
   */
  public buildContext(chunkId: string): ChunkContext | null {
    const db = getDatabaseManager();

    // Get chunk with file and repo info
    const chunkSql = `
      SELECT
        c.id,
        c.name,
        c.chunk_type,
        c.start_line,
        c.end_line,
        c.content,
        f.id as fileId,
        f.path,
        f.language,
        f.size,
        f.metadata as fileMetadata,
        r.id as repoId,
        r.name as repoName,
        r.path as repoPath,
        r.metadata as repoMetadata
      FROM chunks c
      JOIN files f ON c.file_id = f.id
      JOIN repositories r ON c.repo_id = r.id
      WHERE c.id = ?
    `;

    try {
      const stmt = db.prepare(chunkSql);
      const row = stmt.get(chunkId) as any;

      if (!row) {
        this.logger.warn(`Chunk not found: ${chunkId}`);
        return null;
      }

      // Get context code (before and after)
      const context = this.getCodeContext(row.fileId, row.start_line, row.end_line);

      // Get file metadata
      const fileMetadata = row.fileMetadata ? JSON.parse(row.fileMetadata) : {};

      // Get repository technologies
      const techSql = `
        SELECT DISTINCT name FROM technologies
        WHERE repo_id = ?
        ORDER BY name
      `;
      const techStmt = db.prepare(techSql);
      const techs = techStmt.all(row.repoId) as any[];

      return {
        chunk: {
          id: row.id,
          name: row.name,
          type: row.chunk_type,
          startLine: row.start_line,
          endLine: row.end_line,
          content: row.content,
        },
        file: {
          id: row.fileId,
          path: row.path,
          language: row.language,
          size: row.size,
          imports: fileMetadata.imports,
          exports: fileMetadata.exports,
        },
        repository: {
          id: row.repoId,
          name: row.repoName,
          path: row.repoPath,
          technologies: techs.map((t) => t.name),
        },
        context,
      };
    } catch (error) {
      this.logger.error(`Failed to build context for chunk ${chunkId}`, error);
      return null;
    }
  }

  /**
   * Get code context (before and after lines)
   */
  private getCodeContext(
    fileId: string,
    startLine: number,
    endLine: number,
  ): { before: string; after: string } {
    const db = getDatabaseManager();

    // Get all chunks from this file to reconstruct the full content
    const chunksql = `
      SELECT content FROM chunks WHERE file_id = ? ORDER BY start_line
    `;

    try {
      const stmt = db.prepare(chunksql);
      const chunks = stmt.all(fileId) as any[];

      if (chunks.length === 0) {
        return { before: '', after: '' };
      }

      // Reconstruct file content from chunks
      const fullContent = chunks.map((c) => c.content).join('\n');
      const lines = fullContent.split('\n');

      // Get lines before
      const beforeStart = Math.max(0, startLine - this.contextLines - 1);
      const before = lines.slice(beforeStart, startLine - 1).join('\n');

      // Get lines after
      const afterEnd = Math.min(lines.length, endLine + this.contextLines);
      const after = lines.slice(endLine, afterEnd).join('\n');

      return { before, after };
    } catch (error) {
      this.logger.warn(`Failed to get code context for file ${fileId}`, error);
      return { before: '', after: '' };
    }
  }

  /**
   * Get related files in same directory
   */
  public getRelatedFiles(filePath: string, repositoryId: string): string[] {
    const db = getDatabaseManager();

    // Extract directory
    const directory = filePath.substring(0, filePath.lastIndexOf('/'));

    const sql = `
      SELECT DISTINCT path
      FROM files
      WHERE repo_id = ? AND path LIKE ?
      LIMIT 10
    `;

    try {
      const stmt = db.prepare(sql);
      const rows = stmt.all(repositoryId, `${directory}/%`) as any[];
      return rows.map((r) => r.path);
    } catch (error) {
      this.logger.debug('Failed to get related files', error);
      return [];
    }
  }

  /**
   * Get chunks from same file
   */
  public getRelatedChunks(fileId: string, currentChunkId?: string): Array<{
    id: string;
    name?: string;
    type: string;
    startLine: number;
    endLine: number;
  }> {
    const db = getDatabaseManager();

    let sql = `
      SELECT id, name, type, start_line, end_line
      FROM chunks
      WHERE file_id = ?
    `;

    const params: any[] = [fileId];

    if (currentChunkId) {
      sql += ` AND id != ?`;
      params.push(currentChunkId);
    }

    sql += ` ORDER BY start_line LIMIT 5`;

    try {
      const stmt = db.prepare(sql);
      const rows = stmt.all(...params) as any[];

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        startLine: r.start_line,
        endLine: r.end_line,
      }));
    } catch (error) {
      this.logger.debug('Failed to get related chunks', error);
      return [];
    }
  }

  /**
   * Build directory structure for context
   */
  public getDirectoryStructure(repositoryId: string, maxDepth: number = 3): string {
    const db = getDatabaseManager();

    const sql = `
      SELECT DISTINCT relative_path
      FROM files
      WHERE repo_id = ?
      ORDER BY relative_path
      LIMIT 50
    `;

    try {
      const stmt = db.prepare(sql);
      const rows = stmt.all(repositoryId) as any[];

      // Build tree structure
      const tree: Record<string, any> = {};

      for (const row of rows) {
        const parts = row.relative_path.split('/');
        let current = tree;

        for (let i = 0; i < Math.min(parts.length, maxDepth); i++) {
          const part = parts[i];
          if (!current[part]) {
            current[part] = i === parts.length - 1 ? null : {};
          }
          current = current[part];
        }
      }

      // Convert to string representation
      return this.treeToString(tree);
    } catch (error) {
      this.logger.debug('Failed to get directory structure', error);
      return '';
    }
  }

  /**
   * Convert tree object to string representation
   */
  private treeToString(tree: Record<string, any>, indent: string = ''): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(tree)) {
      lines.push(`${indent}├── ${key}`);

      if (value && typeof value === 'object') {
        lines.push(this.treeToString(value, indent + '│   '));
      }
    }

    return lines.join('\n');
  }
}
