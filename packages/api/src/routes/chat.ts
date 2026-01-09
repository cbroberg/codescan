import { Router, Request, Response } from 'express';
import { getChatManager } from '../services/chat/chat-manager.js';
import { getLogger } from '../utils/logger.js';
import { ApiResponse, ChatSession } from '@codescan/shared';

const router: Router = Router();
const logger = getLogger();
const chatManager = getChatManager();

/**
 * POST /api/chat/sessions
 * Create a new chat session
 */
router.post('/sessions', (req: Request, res: Response) => {
  try {
    const session = chatManager.createSession();

    const response: ApiResponse<ChatSession> = {
      success: true,
      data: session,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create session',
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

/**
 * GET /api/chat/sessions/:id
 * Get chat session
 */
router.get('/sessions/:id', (req: Request, res: Response) => {
  try {
    const session = chatManager.getSession(req.params.id);

    if (!session) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Session not found',
        timestamp: new Date().toISOString(),
      };

      return res.status(404).json(response);
    }

    const response: ApiResponse<ChatSession> = {
      success: true,
      data: session,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get session',
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

/**
 * POST /api/chat/sessions/:id/messages
 * Send message to chat session
 */
router.post('/sessions/:id/messages', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Message is required',
        timestamp: new Date().toISOString(),
      };

      return res.status(400).json(response);
    }

    const result = await chatManager.processMessage(req.params.id, message);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to process message', error);

    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process message',
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

/**
 * DELETE /api/chat/sessions/:id
 * Delete chat session
 */
router.delete('/sessions/:id', (req: Request, res: Response) => {
  try {
    const deleted = chatManager.deleteSession(req.params.id);

    if (!deleted) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Session not found',
        timestamp: new Date().toISOString(),
      };

      return res.status(404).json(response);
    }

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Session deleted' },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete session',
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

export default router;
