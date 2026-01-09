import { Parser } from './base-parser.js';
import { TypeScriptParser } from './typescript-parser.js';
import { JavaScriptParser } from './javascript-parser.js';
import { PythonParser, JsonParser, GenericParser } from './generic-parser.js';
import { PhpParser } from './php-parser.js';
import { extname, basename } from 'path';
import { getLogger } from '../../../utils/logger.js';

/**
 * Registry of available parsers
 */
export class ParserRegistry {
  private logger = getLogger();
  private parsers: Map<string, Parser> = new Map();
  private extensionMap: Map<string, string> = new Map();
  private filenameMap: Map<string, string> = new Map();

  constructor() {
    this.registerParsers();
  }

  /**
   * Register all available parsers
   */
  private registerParsers(): void {
    const typeScriptParser = new TypeScriptParser();
    const javaScriptParser = new JavaScriptParser();
    const pythonParser = new PythonParser();
    const jsonParser = new JsonParser();
    const phpParser = new PhpParser();
    const genericParser = new GenericParser();

    // Register parsers
    this.register('typescript', typeScriptParser);
    this.register('javascript', javaScriptParser);
    this.register('python', pythonParser);
    this.register('json', jsonParser);
    this.register('php', phpParser);
    this.register('generic', genericParser);

    // Map extensions to parsers
    typeScriptParser.getSupportedExtensions().forEach((ext) => {
      this.extensionMap.set(ext, 'typescript');
    });

    javaScriptParser.getSupportedExtensions().forEach((ext) => {
      this.extensionMap.set(ext, 'javascript');
    });

    pythonParser.getSupportedExtensions().forEach((ext) => {
      this.extensionMap.set(ext, 'python');
    });

    jsonParser.getSupportedExtensions().forEach((ext) => {
      this.extensionMap.set(ext, 'json');
    });

    phpParser.getSupportedExtensions().forEach((ext) => {
      this.extensionMap.set(ext, 'php');
    });

    genericParser.getSupportedExtensions().forEach((ext) => {
      this.extensionMap.set(ext, 'generic');
    });

    // Map specific filenames
    this.filenameMap.set('package.json', 'json');
    this.filenameMap.set('package-lock.json', 'json');
    this.filenameMap.set('tsconfig.json', 'json');
    this.filenameMap.set('requirements.txt', 'generic');
    this.filenameMap.set('Dockerfile', 'generic');
    this.filenameMap.set('README.md', 'generic');
  }

  /**
   * Register a parser
   */
  public register(name: string, parser: Parser): void {
    this.parsers.set(name, parser);
    this.logger.debug(`Registered parser: ${name}`);
  }

  /**
   * Get parser for a file
   */
  public getParser(filePath: string): Parser {
    // Check specific filename first
    const filename = basename(filePath);
    const filenameParserName = this.filenameMap.get(filename);
    if (filenameParserName) {
      const parser = this.parsers.get(filenameParserName);
      if (parser) return parser;
    }

    // Check extension
    const ext = extname(filePath);
    const parserName = this.extensionMap.get(ext);

    if (parserName) {
      const parser = this.parsers.get(parserName);
      if (parser) return parser;
    }

    // Default to generic
    return this.parsers.get('generic')!;
  }

  /**
   * Get parser by name
   */
  public getParserByName(name: string): Parser | undefined {
    return this.parsers.get(name);
  }

  /**
   * Get all registered parsers
   */
  public getAllParsers(): Map<string, Parser> {
    return this.parsers;
  }

  /**
   * Check if extension is supported
   */
  public supportsExtension(ext: string): boolean {
    return this.extensionMap.has(ext);
  }

  /**
   * Get all supported extensions
   */
  public getSupportedExtensions(): string[] {
    return Array.from(this.extensionMap.keys());
  }
}

// Singleton instance
let registry: ParserRegistry | null = null;

export function getParserRegistry(): ParserRegistry {
  if (!registry) {
    registry = new ParserRegistry();
  }
  return registry;
}
