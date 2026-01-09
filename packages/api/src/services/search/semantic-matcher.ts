import { getClaudeClient } from '../ai/claude-client.js';
import { getLogger } from '../../utils/logger.js';
import { SemanticMatch } from '@codescan/shared';

/**
 * Semantic search using Claude API
 * Analyzes code chunks for contextual relevance
 */
export class SemanticMatcher {
  private logger = getLogger();
  private batchSize: number;

  constructor(batchSize: number = 20) {
    this.batchSize = batchSize;
  }

  /**
   * Analyze chunks for semantic relevance
   */
  public async analyzeChunks(
    query: string,
    chunks: Array<{
      id: string;
      name?: string;
      language: string;
      filePath: string;
      content: string;
    }>,
  ): Promise<SemanticMatch[]> {
    if (chunks.length === 0) {
      return [];
    }

    const claudeClient = getClaudeClient();
    const results: SemanticMatch[] = [];

    // Process in batches to manage token usage
    for (let i = 0; i < chunks.length; i += this.batchSize) {
      const batch = chunks.slice(i, Math.min(i + this.batchSize, chunks.length));

      try {
        const batchResults = await claudeClient.analyzeChunksForRelevance(query, batch);

        results.push(...batchResults.map((r) => ({
          chunkId: r.chunkId,
          relevanceScore: r.relevanceScore,
          reason: r.reason,
          keyTechnologies: r.keyTechnologies,
        })));

        this.logger.debug(`Analyzed batch ${Math.ceil(i / this.batchSize) + 1}/${Math.ceil(chunks.length / this.batchSize)}`);
      } catch (error) {
        this.logger.error(`Failed to analyze batch starting at ${i}`, error);
        // Continue with next batch even if one fails
      }
    }

    // Filter out low-scoring results
    return results.filter((r) => r.relevanceScore >= 30).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Understand user query intent
   */
  public async understandQuery(query: string): Promise<{
    intent: string;
    technologies?: string[];
    codePatterns?: string[];
    clarificationNeeded: boolean;
    clarificationQuestion?: string;
  }> {
    try {
      const claudeClient = getClaudeClient();
      return await claudeClient.understandQuery(query);
    } catch (error) {
      this.logger.error('Failed to understand query', error);
      return {
        intent: query,
        technologies: [],
        codePatterns: [],
        clarificationNeeded: false,
      };
    }
  }

  /**
   * Extract key concepts from code
   */
  public async extractConcepts(
    code: string,
  ): Promise<{
    concepts: string[];
    technologies: string[];
    patterns: string[];
  }> {
    try {
      const claudeClient = getClaudeClient();

      const prompt = `Extract key concepts, technologies, and patterns from this code:

\`\`\`
${code.substring(0, 1000)}
\`\`\`

Respond with JSON:
{
  "concepts": ["concept1", "concept2"],
  "technologies": ["tech1", "tech2"],
  "patterns": ["pattern1", "pattern2"]
}`;

      const message = await claudeClient['client'].messages.create({
        model: claudeClient['model'],
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText =
        message.content[0].type === 'text' ? message.content[0].text : '{}';

      // Extract JSON
      let jsonText = responseText;
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      return JSON.parse(jsonText);
    } catch (error) {
      this.logger.debug('Failed to extract concepts', error);
      return {
        concepts: [],
        technologies: [],
        patterns: [],
      };
    }
  }

  /**
   * Check if query needs clarification
   */
  public async needsClarification(query: string): Promise<boolean> {
    const understanding = await this.understandQuery(query);
    return understanding.clarificationNeeded;
  }

  /**
   * Get clarification question
   */
  public async getClarificationQuestion(query: string): Promise<string | null> {
    const understanding = await this.understandQuery(query);
    return understanding.clarificationQuestion || null;
  }
}
