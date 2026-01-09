/**
 * Prompt templates for Claude API calls
 */

export class SearchPrompts {
  /**
   * Prompt for analyzing code chunks for semantic relevance
   */
  static buildChunkAnalysisPrompt(
    query: string,
    chunks: Array<{
      id: string;
      name?: string;
      language: string;
      filePath: string;
      content: string;
    }>,
  ): string {
    const chunkText = chunks
      .map(
        (chunk, idx) =>
          `[Chunk ${idx + 1}] ID: ${chunk.id}
File: ${chunk.filePath}
Language: ${chunk.language}
${chunk.name ? `Function/Class: ${chunk.name}` : ''}
\`\`\`${chunk.language}
${chunk.content.substring(0, 400)}
\`\`\``,
      )
      .join('\n\n---\n\n');

    return `You are a code search analysis expert. Analyze these code chunks for relevance to the search query.

**Search Query:** "${query}"

**Code Chunks to Analyze:**
${chunkText}

For each chunk, determine:
1. How relevant is it to the query (0-100 score)
2. Why it matches (brief explanation)
3. What key technologies/libraries it uses

Respond ONLY with valid JSON (no markdown formatting):
{
  "results": [
    {
      "chunkId": "chunk-id",
      "relevanceScore": 85,
      "reason": "Uses Teams SDK for adaptive card notifications",
      "keyTechnologies": ["@microsoft/teams-sdk", "TypeScript"]
    }
  ]
}`;
  }

  /**
   * Prompt for understanding user intent
   */
  static buildIntentAnalysisPrompt(query: string): string {
    return `You are a code search expert. Analyze this user query to understand what they're looking for.

**User Query:** "${query}"

Extract:
1. Main intent (what are they looking for?)
2. Programming languages they might mention
3. Frameworks/libraries/technologies
4. Code patterns or concepts
5. If clarification is needed, ask a specific follow-up question

Respond ONLY with valid JSON:
{
  "intent": "brief description of what they want",
  "languages": ["python", "javascript"],
  "technologies": ["react", "typescript", "teams-sdk"],
  "patterns": ["authentication", "error handling"],
  "needsClarification": false,
  "clarificationQuestion": null
}`;
  }

  /**
   * Prompt for generating chat response based on search results
   */
  static buildSearchResponsePrompt(
    userQuery: string,
    searchResults: Array<{
      repository: string;
      file: string;
      relevance: number;
      snippet: string;
    }>,
  ): string {
    const resultsText = searchResults
      .map(
        (r) =>
          `Repository: ${r.repository}
File: ${r.file} (${r.relevance}% match)
\`\`\`
${r.snippet}
\`\`\``,
      )
      .join('\n\n');

    return `The user searched for: "${userQuery}"

Here are the relevant code snippets found:

${resultsText}

Provide a helpful response that:
1. Summarizes what was found
2. Explains how each result relates to the query
3. Points out interesting patterns or implementations
4. Suggests any follow-up searches if helpful

Be concise but informative (2-3 sentences per result).`;
  }

  /**
   * Prompt for generating repository summary
   */
  static buildRepositorySummaryPrompt(
    repoName: string,
    technologies: string[],
    fileCount: number,
    description?: string,
  ): string {
    return `Generate a brief, one-sentence summary of this repository's purpose:

**Repository:** ${repoName}
**Files:** ${fileCount}
**Technologies:** ${technologies.join(', ')}
${description ? `**Description:** ${description}` : ''}

Summary (one sentence):`;
  }

  /**
   * Prompt for finding similar code
   */
  static buildFindSimilarCodePrompt(
    codeSnippet: string,
    context: string,
  ): string {
    return `Analyze this code snippet and describe what it does and what patterns it implements.

\`\`\`
${codeSnippet}
\`\`\`

Context: ${context}

Describe:
1. Main functionality
2. Key libraries/dependencies used
3. Design patterns implemented
4. What to search for to find similar code

Be concise (2-3 sentences).`;
  }

  /**
   * Prompt for extracting key concepts
   */
  static buildConceptExtractionPrompt(codeSnippet: string): string {
    return `Extract the key concepts, technologies, and patterns from this code:

\`\`\`
${codeSnippet}
\`\`\`

List as JSON:
{
  "concepts": ["concept1", "concept2"],
  "technologies": ["tech1", "tech2"],
  "patterns": ["pattern1", "pattern2"],
  "functions": ["funcName1", "funcName2"]
}`;
  }
}

export class ChatPrompts {
  /**
   * Prompt for chat context
   */
  static buildSystemPrompt(): string {
    return `You are CodeScan, an AI assistant for searching and understanding codebases.

Your job is to help developers find and understand code in their local repositories.

When users ask code-related questions:
1. Help them formulate precise search queries
2. Explain search results clearly
3. Suggest related code patterns
4. Ask clarifying questions if the request is ambiguous
5. Always explain why results match their query

Be helpful, concise, and technical.`;
  }

  /**
   * Prompt for refining search queries
   */
  static buildSearchRefinementPrompt(query: string): string {
    return `The user made this search query: "${query}"

Suggest:
1. 2-3 alternative search queries that might yield better results
2. What technologies or patterns might be relevant
3. What files/repositories might contain relevant code

Respond as a JSON object:
{
  "alternatives": ["query1", "query2", "query3"],
  "suggestedTechnologies": ["tech1", "tech2"],
  "suggestedPatterns": ["pattern1", "pattern2"]
}`;
  }

  /**
   * Prompt for multi-turn conversation
   */
  static buildConversationContext(
    conversationHistory: Array<{ role: string; query: string; response: string }>,
  ): string {
    const history = conversationHistory
      .map((item) => `User: ${item.query}\nAssistant: ${item.response}`)
      .join('\n\n');

    return `Conversation history:
${history}

Based on this conversation, the user might be interested in finding code related to the patterns and technologies mentioned above.`;
  }
}
