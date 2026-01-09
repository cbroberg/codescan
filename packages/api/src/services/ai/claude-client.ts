import Anthropic from '@anthropic-ai/sdk';
import { getLogger } from '../../utils/logger.js';

const logger = getLogger();

/**
 * Wrapper around Anthropic Claude API
 */
export class ClaudeClient {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(
    apiKey: string = process.env.ANTHROPIC_API_KEY || '',
    model: string = process.env.AI_MODEL || 'claude-opus-4-5-20251101',
    maxTokens: number = parseInt(process.env.AI_MAX_TOKENS || '4096'),
    temperature: number = parseFloat(process.env.AI_TEMPERATURE || '0.3'),
  ) {
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.maxTokens = maxTokens;
    this.temperature = temperature;

    logger.info(`Claude client initialized with model: ${model}`);
  }

  /**
   * Analyze code chunks for semantic relevance
   */
  public async analyzeChunksForRelevance(
    query: string,
    chunks: Array<{ id: string; name?: string; language: string; content: string }>,
  ): Promise<
    Array<{
      chunkId: string;
      relevanceScore: number;
      reason: string;
      keyTechnologies?: string[];
    }>
  > {
    if (chunks.length === 0) {
      return [];
    }

    const chunkText = chunks
      .map(
        (chunk, idx) =>
          `[Chunk ${idx + 1}] ID: ${chunk.id}\nLanguage: ${chunk.language}\n${chunk.name ? `Name: ${chunk.name}\n` : ''}Content:\n${chunk.content.substring(0, 500)}...`,
      )
      .join('\n\n---\n\n');

    const prompt = `You are a code analysis expert. Analyze these code chunks for relevance to the query.

Query: "${query}"

${chunkText}

For each chunk, respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{
  "results": [
    {
      "chunkId": "the-chunk-id",
      "relevanceScore": <0-100>,
      "reason": "Brief explanation of relevance",
      "keyTechnologies": ["tech1", "tech2"]
    }
  ]
}`;

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: Math.min(2000, this.maxTokens),
        temperature: this.temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

      // Extract JSON from response (handle markdown code blocks)
      let jsonText = responseText;
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonText);
      return parsed.results || [];
    } catch (error) {
      logger.error('Failed to analyze chunks with Claude', error);
      throw error;
    }
  }

  /**
   * Generate search response for chat
   */
  public async generateSearchResponse(
    query: string,
    searchResults: string,
    conversationHistory?: Array<{ role: string; content: string }>,
  ): Promise<string> {
    const messages = [
      ...(conversationHistory || []).map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: `The user asked: "${query}"

Here are the search results:
${searchResults}

Provide a helpful response explaining the search results and what was found. Be concise.`,
      },
    ];

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages,
      });

      return message.content[0].type === 'text' ? message.content[0].text : '';
    } catch (error) {
      logger.error('Failed to generate search response', error);
      throw error;
    }
  }

  /**
   * Understand user intent from query
   */
  public async understandQuery(query: string): Promise<{
    intent: string;
    technologies?: string[];
    codePatterns?: string[];
    clarificationNeeded?: boolean;
    clarificationQuestion?: string;
  }> {
    const prompt = `You are a code search assistant. Analyze this user query to understand their intent.

Query: "${query}"

Respond ONLY with JSON in this format:
{
  "intent": "what the user is looking for (e.g., 'authentication implementation', 'Teams notifications', 'React component')",
  "technologies": ["relevant tech", "stack"],
  "codePatterns": ["relevant code patterns"],
  "clarificationNeeded": false,
  "clarificationQuestion": null
}`;

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

      // Extract JSON
      let jsonText = responseText;
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      return JSON.parse(jsonText);
    } catch (error) {
      logger.error('Failed to understand query', error);
      return {
        intent: query,
        technologies: [],
        codePatterns: [],
        clarificationNeeded: false,
      };
    }
  }

  /**
   * Stream response (for chat interface)
   */
  public async *streamResponse(
    query: string,
    context: string,
  ): AsyncGenerator<string, void, unknown> {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: [
        {
          role: 'user',
          content: `${context}\n\nUser: ${query}`,
        },
      ],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  }
}

// Singleton instance
let claudeClient: ClaudeClient | null = null;

export function initializeClaudeClient(
  apiKey?: string,
  model?: string,
  maxTokens?: number,
  temperature?: number,
): ClaudeClient {
  if (!claudeClient) {
    claudeClient = new ClaudeClient(apiKey, model, maxTokens, temperature);
  }
  return claudeClient;
}

export function getClaudeClient(): ClaudeClient {
  if (!claudeClient) {
    claudeClient = new ClaudeClient();
  }
  return claudeClient;
}
