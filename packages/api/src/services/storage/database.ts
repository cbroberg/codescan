import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { mkdir } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class DatabaseManager {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private SQL: any = null;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * Initialize database connection and create schema
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize sql.js
      this.SQL = await initSqlJs();

      // Ensure directory exists
      const dir = dirname(this.dbPath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      // Load or create database
      if (existsSync(this.dbPath)) {
        const buffer = readFileSync(this.dbPath);
        this.db = new this.SQL.Database(buffer);
        console.log(`✓ Database loaded from ${this.dbPath}`);
      } else {
        this.db = new this.SQL.Database();
        console.log(`✓ New database created`);
      }

      // Load and execute schema
      const schemaPath = resolve(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf-8');

      // Split and execute statements
      const statements = schema
        .split(';')
        .filter((stmt) => stmt.trim());
      for (const stmt of statements) {
        if (stmt.trim()) {
          try {
            this.db!.run(stmt);
          } catch (e) {
            // Schema might already exist, ignore errors
          }
        }
      }

      // Save to disk
      this.save();
      console.log(`✓ Database initialized at ${this.dbPath}`);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  public getDatabase(): SqlJsDatabase | null {
    return this.db;
  }

  /**
   * Execute a prepared statement
   */
  public prepare(sql: string): any {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Return a simple statement wrapper
    return {
      run: (...params: any[]) => {
        try {
          this.db!.run(sql, params);
          this.save();
          return { changes: 1 };
        } catch (error) {
          throw error;
        }
      },
      get: (...params: any[]) => {
        try {
          const results = this.db!.exec(sql, params);
          if (results.length === 0 || results[0].values.length === 0) {
            return undefined;
          }
          const columns = results[0].columns;
          const row = results[0].values[0];
          const obj: any = {};
          columns.forEach((col: string, idx: number) => {
            obj[col] = row[idx];
          });
          return obj;
        } catch (error) {
          throw error;
        }
      },
      all: (...params: any[]) => {
        try {
          const results = this.db!.exec(sql, params);
          if (results.length === 0) {
            return [];
          }
          const columns = results[0].columns;
          return results[0].values.map((row: any) => {
            const obj: any = {};
            columns.forEach((col: string, idx: number) => {
              obj[col] = row[idx];
            });
            return obj;
          });
        } catch (error) {
          throw error;
        }
      },
    };
  }

  /**
   * Execute raw SQL
   */
  public exec(sql: string): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    this.db.run(sql);
    this.save();
  }

  /**
   * Execute a transaction
   */
  public transaction<T>(fn: () => T): T {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.run('BEGIN TRANSACTION');
      const result = fn();
      this.db.run('COMMIT');
      this.save();
      return result;
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  /**
   * Close database connection
   */
  public close(): void {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
      console.log('Database connection closed');
    }
  }

  /**
   * Save database to disk
   */
  private save(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      writeFileSync(this.dbPath, buffer);
    } catch (error) {
      console.error('Failed to save database:', error);
    }
  }

  /**
   * Get database statistics
   */
  public getStats(): {
    repositories: number;
    files: number;
    chunks: number;
    size: number;
  } {
    try {
      const repStmt = this.prepare(
        'SELECT COUNT(*) as count FROM repositories'
      );
      const fileStmt = this.prepare('SELECT COUNT(*) as count FROM files');
      const chunkStmt = this.prepare('SELECT COUNT(*) as count FROM chunks');

      const repositories = (repStmt.get() as any)?.count || 0;
      const files = (fileStmt.get() as any)?.count || 0;
      const chunks = (chunkStmt.get() as any)?.count || 0;

      const fileSize = existsSync(this.dbPath)
        ? readFileSync(this.dbPath).length
        : 0;

      return {
        repositories,
        files,
        chunks,
        size: fileSize,
      };
    } catch (error) {
      return { repositories: 0, files: 0, chunks: 0, size: 0 };
    }
  }
}

let databaseManager: DatabaseManager | null = null;

export function initializeDatabase(dbPath: string): DatabaseManager {
  databaseManager = new DatabaseManager(dbPath);
  return databaseManager;
}

export function getDatabaseManager(): DatabaseManager {
  if (!databaseManager) {
    throw new Error('Database not initialized');
  }
  return databaseManager;
}
