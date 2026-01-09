/**
 * API Server Entry Point
 * This module exports the Express app and database manager
 * for use in tests and other integrations.
 */

export { app, dbManager } from './server.js';
export { DatabaseManager, initializeDatabase, getDatabaseManager } from './services/storage/database.js';
export { initializeLogger, getLogger } from './utils/logger.js';
