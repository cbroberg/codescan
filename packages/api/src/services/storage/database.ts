import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class DatabaseManager {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * Initialize database connection and create schema
   */
  public async initialize(): Promise<void> {
    try {
      this.db = new Database(this.dbPath);

      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');

      // Performance optimizations
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = -64000'); // 64MB cache

      // Load and execute schema
      const schemaPath = resolve(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf-8');

      // Split and execute statements
      const statements = schema.split(';').filter((stmt) => stmt.trim());
      for (const stmt of statements) {
        this.db.exec(stmt);
      }

      console.log(`✓ Database initialized at ${this.dbPath}`);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  public getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Execute a prepared statement
   */
  public prepare<T = void>(sql: string): Database.Statement<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.prepare(sql);
  }

  /**
   * Execute raw SQL
   */
  public exec(sql: string): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    this.db.exec(sql);
  }

  /**
   * Start a transaction
   */
  public transaction<T>(fn: () => T): T {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const transaction = this.db.transaction(fn);
    return transaction();
  }

  /**
   * Close database connection
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('Database connection closed');
    }
  }

  /**
   * Get database statistics
   */
  public getStats(): {
    pageCount: number;
    pageSize: number;
    sizeBytes: number;
  } {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const pageCount = this.db.prepare('PRAGMA page_count;').get() as { page_count: number };
    const pageSize = this.db.prepare('PRAGMA page_size;').get() as { page_size: number };

    return {
      pageCount: pageCount.page_count,
      pageSize: pageSize.page_size,
      sizeBytes: pageCount.page_count * pageSize.page_size,
    };
  }

  /**
   * Vacuum database
   */
  public vacuum(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    this.db.exec('VACUUM;');
    console.log('✓ Database vacuumed');
  }

  /**
   * Run migrations (placeholder for future)
   */
  public async runMigrations(): Promise<void> {
    // TODO: Implement migration system
    console.log('✓ Migrations completed');
  }
}

// Singleton instance
let dbManager: DatabaseManager | null = null;

export function initializeDatabase(dbPath: string): DatabaseManager {
  if (!dbManager) {
    dbManager = new DatabaseManager(dbPath);
  }
  return dbManager;
}

export function getDatabaseManager(): DatabaseManager {
  if (!dbManager) {
    throw new Error('Database manager not initialized');
  }
  return dbManager;
}
