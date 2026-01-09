import { Router, Request, Response } from 'express';
import { SearchEngine } from '../services/search/search-engine.js';
import { getLogger } from '../utils/logger.js';
import { ApiResponse, SearchRequest, SearchResult } from '@codescan/shared';

const router = Router();
const logger = getLogger();
const searchEngine = new SearchEngine();

/**
 * POST /api/search
 * Perform semantic search
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { query, filters, maxResults } = req.body as SearchRequest & { filters?: any };

    if (!query || !query.trim()) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Query is required',
        timestamp: new Date().toISOString(),
      };
      return res.status(400).json(response);
    }

    const startTime = Date.now();

    // Perform search
    const result = await searchEngine.search(query, {
      maxResults: maxResults || 20,
      technologies: filters?.technologies,
      repositories: filters?.repositories,
      languages: filters?.languages,
      minRelevance: filters?.minRelevance,
    });

    // Save to history
    searchEngine.saveSearchHistory(query, result.totalResults);

    logger.info(`Search completed: ${query} (${result.totalResults} results, ${Date.now() - startTime}ms)`);

    const response: ApiResponse<SearchResult> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    logger.error('Search failed', error);

    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

/**
 * GET /api/search/history
 * Get search history
 */
router.get('/history', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const history = searchEngine.getHistory(limit);

    const response: ApiResponse<typeof history> = {
      success: true,
      data: history,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get history',
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

/**
 * POST /api/search/quick
 * Quick search with only keyword matching (no semantic analysis)
 */
router.post('/quick', (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Query is required',
        timestamp: new Date().toISOString(),
      };
      return res.status(400).json(response);
    }

    // For now, return empty - full implementation would use KeywordMatcher directly
    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Quick search not yet implemented' },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Quick search failed',
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

export default router;
