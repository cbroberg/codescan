import { v4 as uuid } from 'uuid';
import { getLogger } from '../../utils/logger.js';
import { SearchEngine } from '../search/search-engine.js';
import { getClaudeClient } from '../ai/claude-client.js';
import { ChatMessage, ChatSession } from '@codescan/shared';

/**
 * Manages chat sessions and conversations
 */
export class ChatManager {
  private logger = getLogger();
  private searchEngine: SearchEngine;
  private sessions: Map<string, ChatSession> = new Map();

  constructor() {
    this.searchEngine = new SearchEngine();
  }

  /**
   * Create a new chat session
   */
  public createSession(): ChatSession {
    const session: ChatSession = {
      id: uuid(),
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(session.id, session);
    this.logger.info(`Created chat session: ${session.id}`);

    return session;
  }

  /**
   * Get chat session
   */
  public getSession(sessionId: string): ChatSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Add message to session
   */
  public addMessage(sessionId: string, message: ChatMessage): ChatSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.messages.push(message);
    session.updatedAt = new Date().toISOString();

    return session;
  }

  /**
   * Process user message and generate response
   */
  public async processMessage(
    sessionId: string,
    userMessage: string,
  ): Promise<{
    response: ChatMessage;
    searchResults?: any;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: uuid(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
      type: 'text',
    };

    session.messages.push(userMsg);

    try {
      const claudeClient = getClaudeClient();

      // Build conversation context
      const conversationHistory = session.messages
        .slice(-6) // Last 3 exchanges
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      // Check if message is a search query
      const isSearchQuery = await this.isSearchQuery(userMessage);

      let searchResults: any = undefined;
      let responseContent = '';

      if (isSearchQuery) {
        // Perform semantic search
        try {
          // Extract meaningful keywords from the message
          const keywords = this.extractSearchQuery(userMessage).split(' ').filter(Boolean);

          // Search for each keyword and combine results (OR logic)
          let results: any = null;

          if (keywords.length > 0) {
            // Search for the first keyword
            results = await this.searchEngine.search(keywords[0], { maxResults: 10 });

            // If we have multiple keywords, also search for each individually and merge
            if (keywords.length > 1) {
              const allResults = results;

              for (let i = 1; i < keywords.length; i++) {
                const keywordResults = await this.searchEngine.search(keywords[i], { maxResults: 10 });

                // Merge results (avoiding duplicates)
                const existingIds = new Set(
                  allResults.results.flatMap((r: any) => r.matches.map((m: any) => m.id)),
                );

                keywordResults.results.forEach((group: any) => {
                  const newMatches = group.matches.filter((m: any) => !existingIds.has(m.id));
                  if (newMatches.length > 0) {
                    const existingGroup = allResults.results.find((r: any) => r.repository.id === group.repository.id);
                    if (existingGroup) {
                      existingGroup.matches.push(...newMatches);
                    } else {
                      allResults.results.push({ ...group, matches: newMatches });
                    }
                  }
                });
              }

              // Limit total results
              allResults.results = allResults.results.map((r: any) => ({
                ...r,
                matches: r.matches.slice(0, 5),
              }));

              results = allResults;
            }
          } else {
            throw new Error('No keywords extracted from search query');
          }

          searchResults = results;

          // Format search results for display
          const resultsText = results.results
            .flatMap((group) =>
              group.matches.map(
                (match) =>
                  `**${group.repository.name}** - ${match.filePath}\n\`\`\`${match.language}\n${match.content.substring(0, 300)}\n\`\`\``,
              ),
            )
            .join('\n\n');

          // Generate response with Claude
          const responseMsg = await claudeClient.generateSearchResponse(
            userMessage,
            resultsText,
            conversationHistory,
          );

          responseContent = responseMsg;
        } catch (error) {
          this.logger.error('Search failed in chat', error);
          responseContent = `I tried to search your code, but encountered an error. Please try a different query.`;
        }
      } else {
        // Regular conversation
        const message = await claudeClient['client'].messages.create({
          model: claudeClient['model'],
          max_tokens: claudeClient['maxTokens'],
          temperature: claudeClient['temperature'],
          messages: [
            {
              role: 'user',
              content: `You are a helpful code search assistant. The user is searching for code in their codebase.

${this.getSystemPrompt()}

User: ${userMessage}`,
            },
          ],
        });

        responseContent =
          message.content[0].type === 'text' ? message.content[0].text : 'Unable to process message';
      }

      // Add assistant response
      const assistantMsg: ChatMessage = {
        id: uuid(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toISOString(),
        type: searchResults ? 'search_results' : 'text',
        searchResults,
      };

      session.messages.push(assistantMsg);
      session.updatedAt = new Date().toISOString();

      return {
        response: assistantMsg,
        searchResults,
      };
    } catch (error) {
      this.logger.error('Failed to process chat message', error);

      // Add error message
      const errorMsg: ChatMessage = {
        id: uuid(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'An error occurred',
        timestamp: new Date().toISOString(),
        type: 'error',
      };

      session.messages.push(errorMsg);
      throw error;
    }
  }

  /**
   * Extract meaningful keywords from a natural language search query
   */
  private extractSearchQuery(message: string): string {
    // Common stop words to remove
    const stopWords = new Set([
      'find', 'search', 'where', 'code', 'file', 'where', 'a', 'the', 'do', 'did',
      'show', 'me', 'i', 'can', 'could', 'would', 'should', 'please', 'how', 'what',
      'is', 'are', 'am', 'be', 'been', 'to', 'in', 'on', 'at', 'of', 'for', 'and',
      'or', 'not', 'but', 'if', 'an', 'by', 'as', 'with', 'from', 'up', 'about'
    ]);

    // Split and filter
    const keywords = message
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 5) // Limit to first 5 meaningful keywords
      .join(' ');

    return keywords || message; // Fallback to original if no keywords extracted
  }

  /**
   * Check if message is a search query
   */
  private async isSearchQuery(message: string): Promise<boolean> {
    // Simple heuristics
    const searchKeywords = [
      'find',
      'search',
      'where',
      'code',
      'file',
      'function',
      'class',
      'implementation',
      'using',
      'with',
      'how',
    ];

    const messageLower = message.toLowerCase();
    const hasSearchKeyword = searchKeywords.some((keyword) => messageLower.includes(keyword));

    // Check if it's a question (contains ?)
    const isQuestion = message.includes('?');

    return hasSearchKeyword || isQuestion;
  }

  /**
   * Get system prompt
   */
  private getSystemPrompt(): string {
    return `You are CodeScan, an AI assistant specialized in helping developers search and understand their codebases.

Your capabilities:
- Search through local code repositories
- Understand code structure and patterns
- Explain code functionality
- Find specific implementations
- Suggest relevant code examples

When users ask about code:
1. If they're looking for specific code, you can search their repositories
2. Explain what the code does and how it works
3. Suggest related or similar code they might find useful

Be helpful, concise, and technical.`;
  }

  /**
   * Delete session
   */
  public deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Get all active sessions
   */
  public getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values());
  }
}

// Singleton instance
let chatManager: ChatManager | null = null;

export function getChatManager(): ChatManager {
  if (!chatManager) {
    chatManager = new ChatManager();
  }
  return chatManager;
}
