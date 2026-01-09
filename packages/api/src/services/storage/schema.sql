-- Repositories table
CREATE TABLE IF NOT EXISTS repositories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'directory',
  last_indexed TEXT,
  file_count INTEGER DEFAULT 0,
  metadata TEXT
);

-- Files table
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  repo_id TEXT NOT NULL,
  path TEXT NOT NULL,
  relative_path TEXT,
  extension TEXT,
  language TEXT,
  size INTEGER,
  last_modified TEXT,
  hash TEXT,
  metadata TEXT,
  FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE,
  UNIQUE(repo_id, path)
);

-- Code chunks table (searchable units)
CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  repo_id TEXT NOT NULL,
  chunk_type TEXT,
  name TEXT,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  content TEXT NOT NULL,
  context TEXT,
  search_text TEXT,
  metadata TEXT,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE
);

-- Technology index
CREATE TABLE IF NOT EXISTS technologies (
  id TEXT PRIMARY KEY,
  repo_id TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT,
  category TEXT,
  FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE,
  UNIQUE(repo_id, name)
);

-- Search history
CREATE TABLE IF NOT EXISTS search_history (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  result_count INTEGER,
  duration_ms INTEGER
);

-- Full-text search virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  chunk_id,
  content,
  search_text,
  name,
  content='chunks',
  content_rowid='rowid'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_files_repo ON files(repo_id);
CREATE INDEX IF NOT EXISTS idx_files_language ON files(language);
CREATE INDEX IF NOT EXISTS idx_chunks_file ON chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_chunks_repo ON chunks(repo_id);
CREATE INDEX IF NOT EXISTS idx_chunks_type ON chunks(chunk_type);
CREATE INDEX IF NOT EXISTS idx_chunks_name ON chunks(name);
CREATE INDEX IF NOT EXISTS idx_tech_repo ON technologies(repo_id);
CREATE INDEX IF NOT EXISTS idx_tech_name ON technologies(name);
CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON search_history(timestamp DESC);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
  INSERT INTO chunks_fts(rowid, chunk_id, content, search_text, name)
  VALUES (new.rowid, new.id, new.content, new.search_text, new.name);
END;

CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
  INSERT INTO chunks_fts(chunks_fts, rowid, chunk_id, content, search_text, name)
  VALUES('delete', old.rowid, old.id, old.content, old.search_text, old.name);
END;

CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON chunks BEGIN
  INSERT INTO chunks_fts(chunks_fts, rowid, chunk_id, content, search_text, name)
  VALUES('delete', old.rowid, old.id, old.content, old.search_text, old.name);
  INSERT INTO chunks_fts(rowid, chunk_id, content, search_text, name)
  VALUES (new.rowid, new.id, new.content, new.search_text, new.name);
END;
