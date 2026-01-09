import { BaseParser } from './base-parser.js';
import { ParsedFile, ASTNode } from '@codescan/shared';
import { v4 as uuid } from 'uuid';

/**
 * PHP file parser
 * Extracts functions, classes, and methods from PHP code
 */
export class PhpParser extends BaseParser {
  parse(filePath: string, content: string): ParsedFile {
    this.filePath = filePath;
    this.content = content;
    this.lines = this.getLines(content);

    const ast = this.buildAST(content);
    const imports = this.extractPhpImports(content);

    return {
      id: uuid(),
      path: filePath,
      language: this.getLanguage(),
      content,
      ast,
      imports,
      exports: [],
      dependencies: [],
      metadata: {
        hasPhp: true,
        isLaravel: content.includes('Laravel') || content.includes('Artisan'),
        isSymfony: content.includes('Symfony'),
        isWordPress: content.includes('wp-') || content.includes('wordpress'),
      },
    };
  }

  /**
   * Build AST from PHP code
   */
  private buildAST(content: string): ASTNode {
    const root: ASTNode = {
      type: 'program',
      startLine: 1,
      endLine: this.lines.length,
      children: [],
    };

    const classNodes = this.extractClasses(content);
    const functionNodes = this.extractFunctions(content);
    const traitNodes = this.extractTraits(content);
    const interfaceNodes = this.extractInterfaces(content);

    const allNodes = [...classNodes, ...functionNodes, ...traitNodes, ...interfaceNodes];
    allNodes.sort((a, b) => a.startLine - b.startLine);

    root.children = allNodes;
    return root;
  }

  /**
   * Extract class declarations
   */
  private extractClasses(content: string): ASTNode[] {
    const nodes: ASTNode[] = [];
    const classPattern = /class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w\s,]+))?\s*{/gm;

    let match;
    while ((match = classPattern.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const className = match[1];
      const endLine = this.findMatchingBrace(content, match.index + match[0].length - 1);

      nodes.push({
        type: 'class',
        name: className,
        startLine,
        endLine,
      });
    }

    return nodes;
  }

  /**
   * Extract function declarations
   */
  private extractFunctions(content: string): ASTNode[] {
    const nodes: ASTNode[] = [];
    const funcPattern = /function\s+(\w+)\s*\(/gm;

    let match;
    while ((match = funcPattern.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const funcName = match[1];
      const bracePos = content.indexOf('{', match.index);
      const endLine = this.findMatchingBrace(content, bracePos);

      nodes.push({
        type: 'function',
        name: funcName,
        startLine,
        endLine,
      });
    }

    return nodes;
  }

  /**
   * Extract trait declarations
   */
  private extractTraits(content: string): ASTNode[] {
    const nodes: ASTNode[] = [];
    const traitPattern = /trait\s+(\w+)\s*{/gm;

    let match;
    while ((match = traitPattern.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const traitName = match[1];
      const endLine = this.findMatchingBrace(content, match.index + match[0].length - 1);

      nodes.push({
        type: 'trait',
        name: traitName,
        startLine,
        endLine,
      });
    }

    return nodes;
  }

  /**
   * Extract interface declarations
   */
  private extractInterfaces(content: string): ASTNode[] {
    const nodes: ASTNode[] = [];
    const interfacePattern = /interface\s+(\w+)(?:\s+extends\s+([\w\s,]+))?\s*{/gm;

    let match;
    while ((match = interfacePattern.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const interfaceName = match[1];
      const endLine = this.findMatchingBrace(content, match.index + match[0].length - 1);

      nodes.push({
        type: 'interface',
        name: interfaceName,
        startLine,
        endLine,
      });
    }

    return nodes;
  }

  /**
   * Find matching brace for opening brace at given position
   */
  private findMatchingBrace(content: string, openPos: number): number {
    let braceCount = 1;
    let pos = openPos + 1;

    while (pos < content.length && braceCount > 0) {
      if (content[pos] === '{') braceCount++;
      else if (content[pos] === '}') braceCount--;
      pos++;
    }

    return content.substring(0, pos).split('\n').length;
  }

  /**
   * Extract PHP requires/includes and use statements
   */
  private extractPhpImports(content: string): string[] {
    const imports: Set<string> = new Set();

    // PHP require, require_once, include, include_once
    const phpImports = content.match(/(?:require|require_once|include|include_once)\s*\(?['"]([^'"]+)['"]\)?;?/g);
    if (phpImports) {
      phpImports.forEach((imp) => {
        const match = imp.match(/['"]([^'"]+)['"]/);
        if (match) imports.add(match[1]);
      });
    }

    // Use statements (namespaces)
    const useStatements = content.match(/use\s+([^;]+);/g);
    if (useStatements) {
      useStatements.forEach((use) => {
        const match = use.match(/use\s+([^;]+);/);
        if (match) imports.add(match[1].trim());
      });
    }

    return Array.from(imports);
  }

  getSupportedExtensions(): string[] {
    return ['.php', '.phtml', '.php5', '.php7', '.phps'];
  }

  getLanguage(): string {
    return 'php';
  }
}
