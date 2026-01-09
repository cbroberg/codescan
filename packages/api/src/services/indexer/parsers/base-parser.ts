import { ParsedFile, ASTNode } from '@codescan/shared';

/**
 * Base parser interface
 */
export interface Parser {
  /**
   * Parse file content and extract AST and metadata
   */
  parse(filePath: string, content: string): ParsedFile;

  /**
   * Supported file extensions (e.g., ['.ts', '.tsx'])
   */
  getSupportedExtensions(): string[];

  /**
   * Language name
   */
  getLanguage(): string;
}

/**
 * Base parser class with common functionality
 */
export abstract class BaseParser implements Parser {
  protected filePath: string = '';
  protected content: string = '';
  protected lines: string[] = [];

  /**
   * Parse file
   */
  abstract parse(filePath: string, content: string): ParsedFile;

  /**
   * Get supported extensions
   */
  abstract getSupportedExtensions(): string[];

  /**
   * Get language name
   */
  abstract getLanguage(): string;

  /**
   * Extract imports from content (regex-based fallback)
   */
  protected extractImports(content: string): string[] {
    const imports: Set<string> = new Set();

    // TypeScript/JavaScript imports
    const tsImports = content.match(/import\s+(?:{[^}]*}|[^;]+)\s+from\s+['"`]([^'"`]+)['"`]/g);
    if (tsImports) {
      tsImports.forEach((imp) => {
        const match = imp.match(/from\s+['"`]([^'"`]+)['"`]/);
        if (match) imports.add(match[1]);
      });
    }

    // CommonJS requires
    const cjsRequires = content.match(/require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g);
    if (cjsRequires) {
      cjsRequires.forEach((req) => {
        const match = req.match(/require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
        if (match) imports.add(match[1]);
      });
    }

    // Python imports
    const pyImports = content.match(/(?:from|import)\s+[\w.]+(?:\s+import\s+[\w,\s*]+)?/g);
    if (pyImports) {
      pyImports.forEach((imp) => {
        const match = imp.match(/(?:from\s+)?(\S+)/);
        if (match) imports.add(match[1]);
      });
    }

    return Array.from(imports);
  }

  /**
   * Extract exports from content (regex-based fallback)
   */
  protected extractExports(content: string): string[] {
    const exports: Set<string> = new Set();

    // TypeScript/JavaScript exports
    const tsExports = content.match(/export\s+(?:default\s+)?(?:class|function|const|let|var|type|interface)\s+(\w+)/g);
    if (tsExports) {
      tsExports.forEach((exp) => {
        const match = exp.match(/(?:class|function|const|let|var|type|interface)\s+(\w+)/);
        if (match) exports.add(match[1]);
      });
    }

    // Named exports
    const namedExports = content.match(/export\s*{([^}]+)}/g);
    if (namedExports) {
      namedExports.forEach((exp) => {
        const names = exp.match(/(\w+)/g);
        if (names) {
          names.forEach((name) => exports.add(name));
        }
      });
    }

    // Python exports (functions and classes at module level)
    const pyExports = content.match(/^(?:def|class)\s+(\w+)/gm);
    if (pyExports) {
      pyExports.forEach((exp) => {
        const match = exp.match(/(?:def|class)\s+(\w+)/);
        if (match) exports.add(match[1]);
      });
    }

    return Array.from(exports);
  }

  /**
   * Extract dependencies from package.json-like content
   */
  protected extractDependencies(content: string): string[] {
    try {
      const json = JSON.parse(content);
      const deps: Set<string> = new Set();

      if (json.dependencies) {
        Object.keys(json.dependencies).forEach((dep) => deps.add(dep));
      }
      if (json.devDependencies) {
        Object.keys(json.devDependencies).forEach((dep) => deps.add(dep));
      }
      if (json.peerDependencies) {
        Object.keys(json.peerDependencies).forEach((dep) => deps.add(dep));
      }

      return Array.from(deps);
    } catch {
      return [];
    }
  }

  /**
   * Split content into lines
   */
  protected getLines(content: string): string[] {
    return content.split('\n');
  }

  /**
   * Extract comment blocks
   */
  protected extractComments(content: string): string[] {
    const comments: Set<string> = new Set();

    // Single-line comments (// or #)
    const singleLineComments = content.match(/(?:\/\/|#)(.+)$/gm);
    if (singleLineComments) {
      singleLineComments.forEach((c) => comments.add(c.trim()));
    }

    // Multi-line comments (/* */ or """ """)
    const multiLineComments = content.match(/\/\*[\s\S]*?\*\/|"""[\s\S]*?"""|'''[\s\S]*?'''/g);
    if (multiLineComments) {
      multiLineComments.forEach((c) => comments.add(c.trim()));
    }

    return Array.from(comments);
  }
}
