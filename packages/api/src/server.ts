import express, { Express, Request, Response, NextFunction } from 'express';
import { expandUser } from './utils/file.js';
import { initializeDatabase, getDatabaseManager } from './services/storage/database.js';
import { initializeLogger, getLogger } from './utils/logger.js';
import { initializeClaudeClient } from './services/ai/claude-client.js';
import { ApiResponse } from '@codescan/shared';
import dotenv from 'dotenv';
import indexingRoutes from './routes/indexing.js';
import repositoriesRoutes from './routes/repositories.js';
import searchRoutes from './routes/search.js';
import chatRoutes from './routes/chat.js';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.API_PORT || 3000;
const DB_PATH = process.env.DB_PATH || '~/.config/codescan/index.db';
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error';

// Initialize services
const logger = initializeLogger(LOG_LEVEL);
const dbManager = initializeDatabase(expandUser(DB_PATH));

// Middleware
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  const response: ApiResponse<{ status: string; timestamp: string }> = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

// Register routes
app.use('/api/index', indexingRoutes);
app.use('/api/repositories', repositoriesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/chat', chatRoutes);

// TODO: Add routes
// - GET /api/config
// - PUT /api/config

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}`, err);

  const response: ApiResponse<null> = {
    success: false,
    error: err.message,
    timestamp: new Date().toISOString(),
  };

  res.status(500).json(response);
});

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Initialize database
    await dbManager.initialize();

    // Initialize Claude client
    initializeClaudeClient();

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`✓ API server running on http://localhost:${PORT}`);
      logger.info(`✓ Health check: http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        dbManager.close();
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully...');
      server.close(() => {
        dbManager.close();
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { app, dbManager };
