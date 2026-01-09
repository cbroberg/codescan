import { Router, Request, Response } from 'express';
import { getRepositoryManager } from '../services/storage/repositories.js';
import { VSCodeIntegration } from '../utils/vscode.js';
import { ApiResponse, Repository } from '@codescan/shared';

const router: Router = Router();
const repoManager = getRepositoryManager();

/**
 * GET /api/repositories
 * Get all repositories
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const repos = repoManager.getAll();
    const response: ApiResponse<Repository[]> = {
      success: true,
      data: repos,
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get repositories',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/repositories/:id
 * Get repository by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const repo = repoManager.getById(id);

    if (!repo) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Repository not found',
        timestamp: new Date().toISOString(),
      };
      return res.status(404).json(response);
    }

    const stats = repoManager.getStats(id);
    const response: ApiResponse<Repository & { stats: typeof stats }> = {
      success: true,
      data: { ...repo, stats },
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get repository',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/repositories/:id/technologies
 * Get technologies used in repository
 */
router.get('/:id/technologies', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const techs = repoManager.getTechnologies(id);

    const response: ApiResponse<typeof techs> = {
      success: true,
      data: techs,
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get technologies',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/repositories/:id
 * Delete repository
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = repoManager.delete(id);

    if (!success) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to delete repository',
        timestamp: new Date().toISOString(),
      };
      return res.status(500).json(response);
    }

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Repository deleted' },
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete repository',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/repositories/vscode/open-file
 * Open file in VS Code
 */
router.post('/vscode/open-file', async (req: Request, res: Response) => {
  try {
    const { filePath, line, column } = req.body;

    if (!filePath) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'File path is required',
        timestamp: new Date().toISOString(),
      };
      return res.status(400).json(response);
    }

    const vsCodeUrl = VSCodeIntegration.generateFileUrl(filePath, line, column);

    const response: ApiResponse<{ url: string; command: string }> = {
      success: true,
      data: {
        url: vsCodeUrl,
        command: VSCodeIntegration.generateVsCodeCommand(filePath, line, column),
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate VS Code URL',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/repositories/vscode/open-folder
 * Open folder in VS Code
 */
router.post('/vscode/open-folder', async (req: Request, res: Response) => {
  try {
    const { folderPath } = req.body;

    if (!folderPath) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Folder path is required',
        timestamp: new Date().toISOString(),
      };
      return res.status(400).json(response);
    }

    const vsCodeUrl = VSCodeIntegration.generateFolderUrl(folderPath);

    const response: ApiResponse<{ url: string }> = {
      success: true,
      data: { url: vsCodeUrl },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate VS Code URL',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

export default router;
