import { BaseParser } from './base-parser.js';
import { ParsedFile } from '@codescan/shared';
import { v4 as uuid } from 'uuid';

/**
 * Generic parser for files without language-specific parsing
 */
export class GenericParser extends BaseParser {
  getSupportedExtensions(): string[] {
    return ['.md', '.txt', '.json', '.yaml', '.yml', '.xml', '.html', '.css'];
  }

  getLanguage(): string {
    return 'text';
  }

  parse(filePath: string, content: string): ParsedFile {
    this.filePath = filePath;
    this.content = content;

    const imports = this.extractImports(content);
    const exports = this.extractExports(content);
    const dependencies = this.extractDependencies(content);

    return {
      id: uuid(),
      path: filePath,
      language: this.getLanguage(),
      content,
      imports,
      exports,
      dependencies,
      metadata: {
        lineCount: content.split('\n').length,
        wordCount: content.split(/\s+/).length,
      },
    };
  }
}

/**
 * Python parser
 */
export class PythonParser extends BaseParser {
  getSupportedExtensions(): string[] {
    return ['.py'];
  }

  getLanguage(): string {
    return 'python';
  }

  parse(filePath: string, content: string): ParsedFile {
    this.filePath = filePath;
    this.content = content;

    const imports = this.extractImports(content);
    const exports = this.extractExports(content);

    return {
      id: uuid(),
      path: filePath,
      language: this.getLanguage(),
      content,
      imports,
      exports,
      dependencies: [],
      metadata: {
        hasDjango: content.includes('django'),
        hasFlask: content.includes('flask'),
        hasNumPy: content.includes('numpy'),
        hasPandas: content.includes('pandas'),
      },
    };
  }
}

/**
 * JSON parser
 */
export class JsonParser extends BaseParser {
  getSupportedExtensions(): string[] {
    return ['.json'];
  }

  getLanguage(): string {
    return 'json';
  }

  parse(filePath: string, content: string): ParsedFile {
    this.filePath = filePath;
    this.content = content;

    let metadata: Record<string, unknown> = {};

    try {
      const json = JSON.parse(content);
      metadata = {
        keys: Object.keys(json),
        hasName: 'name' in json,
        hasVersion: 'version' in json,
        hasDependencies: 'dependencies' in json,
      };

      // Special handling for package.json
      if (filePath.endsWith('package.json')) {
        metadata.packageName = json.name;
        metadata.packageVersion = json.version;
        metadata.packageType = json.type;
      }
    } catch {
      // Invalid JSON, just index as text
    }

    return {
      id: uuid(),
      path: filePath,
      language: this.getLanguage(),
      content,
      imports: [],
      exports: [],
      dependencies: this.extractDependencies(content),
      metadata,
    };
  }
}
