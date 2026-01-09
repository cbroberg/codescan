import { BaseParser } from './base-parser.js';
import { ParsedFile, ASTNode } from '@codescan/shared';
import { v4 as uuid } from 'uuid';
import { getLogger } from '../../../utils/logger.js';

/**
 * TypeScript/JavaScript parser using regex-based AST extraction
 * Note: Full tree-sitter integration would require native bindings setup
 */
export class TypeScriptParser extends BaseParser {
  private logger = getLogger();

  getSupportedExtensions(): string[] {
    return ['.ts', '.tsx'];
  }

  getLanguage(): string {
    return 'typescript';
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
        hasTypeScript: content.includes(': ') || content.includes('interface ') || content.includes('type '),
        isReact: content.includes('import React') || content.includes('import { FC } ') || content.includes('.tsx'),
        isNest:
          content.includes('@Module') ||
          content.includes('@Controller') ||
          content.includes('@Service') ||
          content.includes('@Injectable'),
      },
    };
  }

  /**
   * Build AST from TypeScript/JavaScript code
   */
  private buildAST(content: string): ASTNode {
    const root: ASTNode = {
      type: 'program',
      startLine: 1,
      endLine: this.lines.length,
      children: [],
    };

    // Extract top-level declarations
    const functionDeclarations = this.extractFunctionDeclarations(content);
    const classDeclarations = this.extractClassDeclarations(content);
    const typeDeclarations = this.extractTypeDeclarations(content);
    const interfaceDeclarations = this.extractInterfaceDeclarations(content);
    const constDeclarations = this.extractConstDeclarations(content);

    // Combine all declarations
    const allDeclarations = [
      ...functionDeclarations,
      ...classDeclarations,
      ...typeDeclarations,
      ...interfaceDeclarations,
      ...constDeclarations,
    ];

    // Sort by line number
    allDeclarations.sort((a, b) => a.startLine - b.startLine);

    root.children = allDeclarations;

    return root;
  }

  /**
   * Extract function declarations
   */
  private extractFunctionDeclarations(content: string): ASTNode[] {
    const nodes: ASTNode[] = [];

    // Async/regular function declarations: function name(...) or const name = (...) =>
    const funcPattern =
      /(?:async\s+)?(?:function|const)\s+(\w+)\s*(?:\([^)]*\))?.*?(?:=>|{)/gm;
    const commentPattern = /\/\/.*?$|\/\*[\s\S]*?\*\//gm;
    const contentWithoutComments = content.replace(commentPattern, '');

    let match;
    while ((match = funcPattern.exec(contentWithoutComments)) !== null) {
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
   * Extract class declarations
   */
  private extractClassDeclarations(content: string): ASTNode[] {
    const nodes: ASTNode[] = [];

    const classPattern = /class\s+(\w+)(?:\s+extends\s+(\w+))?\s*{/gm;
    const commentPattern = /\/\/.*?$|\/\*[\s\S]*?\*\//gm;
    const contentWithoutComments = content.replace(commentPattern, '');

    let match;
    while ((match = classPattern.exec(contentWithoutComments)) !== null) {
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
  private extractClassMembers(classContent: string): ASTNode[] {
    const members: ASTNode[] = [];

    // Extract methods
    const methodPattern = /^\s*(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\(/gm;
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
   * Extract type declarations
   */
  private extractTypeDeclarations(content: string): ASTNode[] {
    const nodes: ASTNode[] = [];

    const typePattern = /type\s+(\w+)\s*=\s*{/gm;
    let match;
    while ((match = typePattern.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const typeContent = this.extractBlockContent(content, match.index);
      const endLine = startLine + typeContent.split('\n').length - 1;

      nodes.push({
        type: 'type',
        name: match[1],
        startLine,
        endLine,
        children: [],
      });
    }

    return nodes;
  }

  /**
   * Extract interface declarations
   */
  private extractInterfaceDeclarations(content: string): ASTNode[] {
    const nodes: ASTNode[] = [];

    const interfacePattern = /interface\s+(\w+)(?:\s+extends\s+(\w+))?\s*{/gm;
    let match;
    while ((match = interfacePattern.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const interfaceContent = this.extractBlockContent(content, match.index);
      const endLine = startLine + interfaceContent.split('\n').length - 1;

      nodes.push({
        type: 'interface',
        name: match[1],
        startLine,
        endLine,
        children: [],
        metadata: {
          extends: match[2] || undefined,
        },
      });
    }

    return nodes;
  }

  /**
   * Extract const declarations (top-level)
   */
  private extractConstDeclarations(content: string): ASTNode[] {
    const nodes: ASTNode[] = [];

    // Only top-level consts at column 0
    const constPattern = /^const\s+(\w+)\s*=/gm;
    let match;
    while ((match = constPattern.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;

      // Only include if it looks like a constant definition (not inside a function)
      const lineStart = content.lastIndexOf('\n', match.index) + 1;
      if (match.index - lineStart === 0) {
        // At start of line
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
