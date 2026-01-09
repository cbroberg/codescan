import { Chunk } from '@codescan/shared';
import { ParsedFile, ASTNode } from '@codescan/shared';
import { v4 as uuid } from 'uuid';

export interface ChunkingConfig {
  chunkSize: number; // Max lines per chunk
  chunkOverlap: number; // Lines to overlap between chunks
}

/**
 * Splits parsed files into searchable chunks
 */
export class CodeChunker {
  private config: ChunkingConfig;

  constructor(config: ChunkingConfig) {
    this.config = config;
  }

  /**
   * Chunk a parsed file
   */
  public chunk(file: ParsedFile, repositoryId: string, fileId: string): Chunk[] {
    // Prefer AST-based chunking for structured languages
    if (file.ast && file.ast.children && file.ast.children.length > 0) {
      return this.chunkByAST(file, repositoryId, fileId);
    }

    // Fallback to semantic chunking
    return this.chunkBySemanticBoundaries(file, repositoryId, fileId);
  }

  /**
   * Chunk by AST nodes (preferred method)
   */
  private chunkByAST(file: ParsedFile, repositoryId: string, fileId: string): Chunk[] {
    const chunks: Chunk[] = [];
    const content = file.content;
    const lines = content.split('\n');

    // Process each top-level declaration
    const declarations = file.ast!.children || [];

    for (const decl of declarations) {
      const chunkContent = lines.slice(decl.startLine - 1, decl.endLine).join('\n');

      // Extract context (surrounding code)
      const contextStart = Math.max(0, decl.startLine - 10);
      const contextEnd = Math.min(lines.length, decl.endLine + 5);
      const context = lines.slice(contextStart, contextEnd).join('\n');

      // Create search text (content + metadata)
      const searchText = [chunkContent, decl.name || '', decl.type, ...(decl.children?.map((c) => c.name) || [])].filter(Boolean).join(' ');

      const chunk: Chunk = {
        id: uuid(),
        fileId,
        repositoryId,
        type: (decl.type as any) || 'generic',
        name: decl.name,
        startLine: decl.startLine,
        endLine: decl.endLine,
        content: chunkContent,
        context,
        metadata: decl.metadata,
      };

      chunks.push(chunk);
    }

    // If no chunks were created, create a default chunk for the whole file
    if (chunks.length === 0) {
      chunks.push(this.createDefaultChunk(file, repositoryId, fileId));
    }

    return chunks;
  }

  /**
   * Chunk by semantic boundaries (for unstructured or unsupported languages)
   */
  private chunkBySemanticBoundaries(file: ParsedFile, repositoryId: string, fileId: string): Chunk[] {
    const chunks: Chunk[] = [];
    const content = file.content;
    const lines = content.split('\n');

    let currentChunk = 0;
    let chunkStartLine = 0;
    const chunkLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for semantic boundaries
      const isBoundary =
        line.trim().startsWith('function ') ||
        line.trim().startsWith('class ') ||
        line.trim().startsWith('def ') ||
        line.trim().startsWith('export ') ||
        line.trim().startsWith('import ') ||
        line.trim().startsWith('//') ||
        (line.trim().length === 0 && chunkLines.length > 0);

      // Create chunk if we hit a boundary or reach chunk size
      if ((isBoundary || chunkLines.length >= this.config.chunkSize) && chunkLines.length > 0) {
        const chunkContent = chunkLines.join('\n');

        // Extract context
        const contextStart = Math.max(0, chunkStartLine - 5);
        const contextEnd = Math.min(lines.length, i + 5);
        const context = lines.slice(contextStart, contextEnd).join('\n');

        const chunk: Chunk = {
          id: uuid(),
          fileId,
          repositoryId,
          type: 'generic',
          startLine: chunkStartLine + 1,
          endLine: i,
          content: chunkContent,
          context,
        };

        chunks.push(chunk);

        // Reset for next chunk (with overlap)
        chunkStartLine = Math.max(0, i - this.config.chunkOverlap);
        chunkLines.splice(0, chunkLines.length - this.config.chunkOverlap);
      }

      chunkLines.push(line);
    }

    // Add remaining chunk
    if (chunkLines.length > 0) {
      const chunkContent = chunkLines.join('\n');
      const context = lines
        .slice(Math.max(0, chunkStartLine - 5), Math.min(lines.length, lines.length + 5))
        .join('\n');

      chunks.push({
        id: uuid(),
        fileId,
        repositoryId,
        type: 'generic',
        startLine: chunkStartLine + 1,
        endLine: lines.length,
        content: chunkContent,
        context,
      });
    }

    return chunks.length > 0 ? chunks : [this.createDefaultChunk(file, repositoryId, fileId)];
  }

  /**
   * Create a default chunk for the entire file
   */
  private createDefaultChunk(file: ParsedFile, repositoryId: string, fileId: string): Chunk {
    const lines = file.content.split('\n');

    return {
      id: uuid(),
      fileId,
      repositoryId,
      type: 'generic',
      startLine: 1,
      endLine: lines.length,
      content: file.content,
      context: file.content,
    };
  }

  /**
   * Create search text from chunk
   */
  public createSearchText(chunk: Chunk): string {
    const parts = [chunk.content, chunk.name || '', chunk.type];

    // Add metadata
    if (chunk.metadata) {
      if (typeof chunk.metadata === 'object') {
        parts.push(JSON.stringify(chunk.metadata));
      } else {
        parts.push(String(chunk.metadata));
      }
    }

    return parts.filter((p) => p && p.trim()).join(' ').substring(0, 10000); // Limit size
  }
}
