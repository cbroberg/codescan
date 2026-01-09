import { FileScanner, ScannedFile } from './file-scanner.js';
import { CodeChunker } from './chunker.js';
import { getParserRegistry } from './parsers/parser-registry.js';
import { getDatabaseManager } from '../storage/database.js';
import { getLogger } from '../../utils/logger.js';
import { v4 as uuid } from 'uuid';
import { readFileSync } from 'fs';
import { DEFAULT_INDEXING_CONFIG } from '@codescan/shared';
import type { IndexingConfig, IndexingProgress } from '@codescan/shared';

export interface IndexingState {
  isIndexing: boolean;
  progress: IndexingProgress | null;
  lastError?: string;
}

/**
 * Manages the entire indexing process
 */
export class IndexManager {
  private logger = getLogger();
  private fileScanner: FileScanner;
  private chunker: CodeChunker;
  private state: IndexingState = {
    isIndexing: false,
    progress: null,
  };
  private startTime: number = 0;

  constructor(config: IndexingConfig = DEFAULT_INDEXING_CONFIG) {
    this.fileScanner = new FileScanner(
      config.fileExtensions,
      config.excludePatterns,
      config.maxFileSize,
    );

    this.chunker = new CodeChunker({
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
    });
  }

  /**
   * Get current indexing state
   */
  public getState(): IndexingState {
    return this.state;
  }

  /**
   * Index a repository
   */
  public async indexRepository(repositoryPath: string, repositoryName?: string): Promise<void> {
    if (this.state.isIndexing) {
      throw new Error('Indexing already in progress');
    }

    this.state.isIndexing = true;
    this.startTime = Date.now();
    const db = getDatabaseManager();

    try {
      const repoName = repositoryName || repositoryPath.split('/').pop() || 'unknown';
      const repoId = uuid();

      // Register repository
      const insertRepoStmt = db.prepare(
        `INSERT INTO repositories (id, name, path, type, last_indexed, metadata)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );

      insertRepoStmt.run(repoId, repoName, repositoryPath, 'directory', new Date().toISOString(), '{}');

      this.logger.info(`✓ Registered repository: ${repoName} (${repositoryPath})`);

      // Scan files
      this.updateProgress('scanning', 0, 0, 0);
      const scanResult = this.fileScanner.scan(repositoryPath);
      this.logger.info(`✓ Found ${scanResult.totalFiles} files to index`);

      // Parse and chunk files
      const parserRegistry = getParserRegistry();
      const filesPerSecond: number[] = [];
      const totalFiles = scanResult.files.length;

      for (let i = 0; i < scanResult.files.length; i++) {
        const scannedFile = scanResult.files[i];
        const fileStartTime = Date.now();

        try {
          await this.indexFile(db, repoId, scannedFile, parserRegistry);

          const elapsed = Date.now() - fileStartTime;
          const filesPerSec = 1000 / Math.max(elapsed, 1);
          filesPerSecond.push(filesPerSec);

          // Update progress
          const avgFps = filesPerSecond.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, filesPerSecond.length);
          const remaining = totalFiles - (i + 1);
          const estimatedMs = remaining / avgFps * 1000;

          this.updateProgress(
            i < totalFiles / 2 ? 'parsing' : 'chunking',
            i + 1,
            totalFiles,
            avgFps,
          );

          if ((i + 1) % 100 === 0) {
            this.logger.info(`✓ Indexed ${i + 1}/${totalFiles} files`);
          }
        } catch (error) {
          this.logger.warn(`Failed to index file ${scannedFile.path}`, error);
        }
      }

      // Update repository metadata
      const updateRepoStmt = db.prepare(
        `UPDATE repositories SET file_count = ?, last_indexed = ? WHERE id = ?`,
      );
      updateRepoStmt.run(totalFiles, new Date().toISOString(), repoId);

      this.logger.info(`✓ Repository indexed: ${totalFiles} files processed in ${this.formatDuration(Date.now() - this.startTime)}`);
    } catch (error) {
      this.state.lastError = error instanceof Error ? error.message : String(error);
      this.logger.error('Indexing failed', error);
      throw error;
    } finally {
      this.state.isIndexing = false;
      this.state.progress = null;
    }
  }

  /**
   * Index a single file
   */
  private async indexFile(db: any, repositoryId: string, scannedFile: ScannedFile, parserRegistry: any): Promise<void> {
    const content = readFileSync(scannedFile.path, 'utf-8');
    const parser = parserRegistry.getParser(scannedFile.path);

    // Parse file
    const parsedFile = parser.parse(scannedFile.path, content);

    // Insert file record
    const fileId = uuid();
    const insertFileStmt = db.prepare(
      `INSERT INTO files (id, repo_id, path, relative_path, extension, language, size, last_modified, hash, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    insertFileStmt.run(
      fileId,
      repositoryId,
      scannedFile.path,
      scannedFile.relativePath,
      scannedFile.extension,
      scannedFile.language,
      scannedFile.size,
      new Date().toISOString(),
      scannedFile.hash,
      JSON.stringify(parsedFile.metadata || {}),
    );

    // Chunk file
    const chunks = this.chunker.chunk(parsedFile, repositoryId, fileId);

    // Insert chunks with transaction
    const insertChunkStmt = db.prepare(
      `INSERT INTO chunks (id, file_id, repo_id, chunk_type, name, start_line, end_line, content, context, search_text, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    db.transaction(() => {
      for (const chunk of chunks) {
        const searchText = this.chunker.createSearchText(chunk);

        insertChunkStmt.run(
          chunk.id,
          chunk.fileId,
          chunk.repositoryId,
          chunk.type,
          chunk.name || null,
          chunk.startLine,
          chunk.endLine,
          chunk.content,
          chunk.context,
          searchText,
          JSON.stringify(chunk.metadata || {}),
        );
      }
    })();

    // Index technologies
    if (parsedFile.dependencies && parsedFile.dependencies.length > 0) {
      const insertTechStmt = db.prepare(
        `INSERT INTO technologies (id, repo_id, name, category)
         VALUES (?, ?, ?, ?)`,
      );

      for (const dep of parsedFile.dependencies) {
        insertTechStmt.run(uuid(), repositoryId, dep, 'dependency');
      }
    }
  }

  /**
   * Update progress state
   */
  private updateProgress(phase: 'scanning' | 'parsing' | 'chunking' | 'storing', processed: number, total: number, fps: number): void {
    this.state.progress = {
      phase,
      filesProcessed: processed,
      totalFiles: total,
      filesPerSecond: fps,
      estimatedTimeRemaining: total > 0 ? (total - processed) / Math.max(fps, 0.1) : 0,
    };
  }

  /**
   * Format duration for display
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = seconds / 60;
    return `${minutes.toFixed(1)}m`;
  }
}
