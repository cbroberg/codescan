import { BaseParser } from './base-parser.js';
import { ParsedFile } from '@codescan/shared';
import { v4 as uuid } from 'uuid';
import { getLogger } from '../../../utils/logger.js';

/**
 * JavaScript parser - handles .js and .jsx files
 * Shares AST extraction logic with TypeScript but is language-specific
 */
export class JavaScriptParser extends BaseParser {
  private logger = getLogger();

  getSupportedExtensions(): string[] {
    return ['.js', '.jsx'];
  }

  getLanguage(): string {
    return 'javascript';
  }

  parse(filePath: string, content: string): ParsedFile {
    this.filePath = filePath;
    this.content = content;
    this.lines = this.getLines(content);

    const ast = this.buildAST(content);
    const imports = this.extractImports(content);
    const exports = this.extractExports(content);

    return {
      id: uuid(),
      path: filePath,
      language: this.getLanguage(),
      content,
      ast,
      imports,
      exports,
      dependencies: [],
      metadata: {
        isReact: content.includes('import React') || content.includes('import { FC } ') || content.includes('.jsx'),
        isNodeApp: content.includes('require(') || content.includes('module.exports'),
        isNextJs: content.includes('next/') || content.includes('getServerSideProps') || content.includes('getStaticProps'),
        isExpress: content.includes('express()') || content.includes('app.use'),
      },
    };
  }

  /**
   * Build AST from JavaScript code
   */
  private buildAST(content: string) {
    const root = {
      type: 'program',
      startLine: 1,
      endLine: this.lines.length,
      children: [] as any[],
    };

    // Extract all top-level declarations
    const functionDeclarations = this.extractFunctionDeclarations(content);
    const classDeclarations = this.extractClassDeclarations(content);
    const constDeclarations = this.extractConstDeclarations(content);
    const arrowFunctions = this.extractArrowFunctions(content);

    // Combine and sort by line number
    const allDeclarations = [
      ...functionDeclarations,
      ...classDeclarations,
      ...constDeclarations,
      ...arrowFunctions,
    ].sort((a, b) => a.startLine - b.startLine);

    root.children = allDeclarations;
    return root;
  }

  /**
   * Extract function declarations: function name() { ... }
   */
  private extractFunctionDeclarations(content: string) {
    const nodes: any[] = [];
    const pattern = /(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*{/gm;
    const commentPattern = /\/\/.*?$|\/\*[\s\S]*?\*\//gm;
    const contentWithoutComments = content.replace(commentPattern, '');

    let match;
    while ((match = pattern.exec(contentWithoutComments)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const funcContent = this.extractBlockContent(contentWithoutComments, match.index);
      const endLine = startLine + funcContent.split('\n').length - 1;

      nodes.push({
        type: 'function',
        name: match[1],
        startLine,
        endLine,
        children: [],
        metadata: {
          isAsync: /async\s+/.test(match[0]),
        },
      });
    }

    return nodes;
  }

  /**
   * Extract class declarations: class Name { ... }
   */
  private extractClassDeclarations(content: string) {
    const nodes: any[] = [];
    const pattern = /class\s+(\w+)(?:\s+extends\s+(\w+))?\s*{/gm;
    const commentPattern = /\/\/.*?$|\/\*[\s\S]*?\*\//gm;
    const contentWithoutComments = content.replace(commentPattern, '');

    let match;
    while ((match = pattern.exec(contentWithoutComments)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const classContent = this.extractBlockContent(contentWithoutComments, match.index);
      const endLine = startLine + classContent.split('\n').length - 1;

      const children = this.extractClassMembers(classContent);

      nodes.push({
        type: 'class',
        name: match[1],
        startLine,
        endLine,
        children,
        metadata: {
          extends: match[2] || undefined,
        },
      });
    }

    return nodes;
  }

  /**
   * Extract class members (methods, properties)
   */
  private extractClassMembers(classContent: string) {
    const members: any[] = [];

    // Extract methods
    const methodPattern = /^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/gm;
    let match;
    while ((match = methodPattern.exec(classContent)) !== null) {
      const startLine = classContent.substring(0, match.index).split('\n').length;
      const methodContent = this.extractBlockContent(classContent, match.index);
      const endLine = startLine + methodContent.split('\n').length - 1;

      members.push({
        type: 'method',
        name: match[1],
        startLine,
        endLine,
        children: [],
      });
    }

    return members;
  }

  /**
   * Extract const declarations: const name = ...
   */
  private extractConstDeclarations(content: string) {
    const nodes: any[] = [];
    const pattern = /^const\s+(\w+)\s*=/gm;

    let match;
    while ((match = pattern.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;

      // Check if it's at start of line
      const lineStart = content.lastIndexOf('\n', match.index) + 1;
      if (match.index - lineStart === 0) {
        nodes.push({
          type: 'const',
          name: match[1],
          startLine,
          endLine: startLine,
          children: [],
        });
      }
    }

    return nodes;
  }

  /**
   * Extract arrow functions: const name = (...) => { ... }
   */
  private extractArrowFunctions(content: string) {
    const nodes: any[] = [];
    const pattern = /^const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/gm;

    let match;
    while ((match = pattern.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;

      // Find the function body
      const arrowIndex = content.indexOf('=>', match.index);
      if (arrowIndex !== -1) {
        const funcContent = this.extractBlockContent(content, arrowIndex + 2);
        const endLine = startLine + funcContent.split('\n').length - 1;

        nodes.push({
          type: 'arrow_function',
          name: match[1],
          startLine,
          endLine,
          children: [],
          metadata: {
            isAsync: /async\s+/.test(match[0]),
          },
        });
      }
    }

    return nodes;
  }

  /**
   * Extract block content { ... }
   */
  private extractBlockContent(content: string, startIndex: number): string {
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let foundStart = false;

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];

      // Handle strings
      if ((char === '"' || char === "'" || char === '`') && content[i - 1] !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        continue;
      }

      if (inString) continue;

      // Count braces
      if (char === '{') {
        braceCount++;
        foundStart = true;
      } else if (char === '}') {
        braceCount--;

        if (foundStart && braceCount === 0) {
          return content.substring(startIndex, i + 1);
        }
      }
    }

    // If we didn't find matching braces, return to end of content
    return content.substring(startIndex);
  }
}
