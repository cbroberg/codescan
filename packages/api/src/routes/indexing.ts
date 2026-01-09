import { Router, Request, Response } from 'express';
import { IndexManager } from '../services/indexer/index-manager.js';
import { getRepositoryManager } from '../services/storage/repositories.js';
import { getLogger } from '../utils/logger.js';
import { ApiResponse, IndexingStatus } from '@codescan/shared';

const router: Router = Router();
const logger = getLogger();
const indexManager = new IndexManager();
const repoManager = getRepositoryManager();

/**
 * POST /api/index/build
 * Build or rebuild index for a repository
 */
router.post('/build', async (req: Request, res: Response) => {
  try {
    const { path, name } = req.body;

    if (!path) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Repository path is required',
        timestamp: new Date().toISOString(),
      };
      return res.status(400).json(response);
    }

    // Perform indexing synchronously and wait for completion
    await indexManager.indexRepository(path, name);

    const response: ApiResponse<{ message: string; repositoryPath: string }> = {
      success: true,
      data: {
        message: 'Indexing completed',
        repositoryPath: path,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to index repository',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/index/status
 * Get current indexing status and progress
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const state = indexManager.getState();
    const repos = repoManager.getAll();

    const status: IndexingStatus = {
      isIndexing: state.isIndexing,
      progress: state.progress || undefined,
      totalRepositories: repos.length,
      totalFiles: repos.reduce((sum, r) => sum + (r.fileCount || 0), 0),
      totalChunks: 0, // TODO: Add chunk count query
      databaseSize: 0, // TODO: Get actual database size
    };

    const response: ApiResponse<IndexingStatus> = {
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get indexing status',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/index/watch/start
 * Start file watcher for incremental indexing
 */
router.post('/watch/start', (req: Request, res: Response) => {
  try {
    // TODO: Implement file watcher
    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'File watcher started' },
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start file watcher',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/index/watch/stop
 * Stop file watcher
 */
router.post('/watch/stop', (req: Request, res: Response) => {
  try {
    // TODO: Implement file watcher
    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'File watcher stopped' },
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to stop file watcher',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

export default router;
