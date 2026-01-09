# Semantic Code Search Tool - Implementation Plan

## Overview
AI-powered semantic search tool for local source code with **both CLI and Web GUI interfaces**. Uses Claude API for intelligent code understanding with local indexing for fast performance.

**Example Use Case:** "Find repos where I implemented Microsoft Teams notifications"

---

## Architecture: Dual Interface Design

### Backend: API Server
- **Node.js + TypeScript** REST/WebSocket API server
- Shared business logic for both CLI and Web interfaces
- Runs locally (localhost:3000)
- Can be used headless or with GUI

### Frontend 1: CLI Tool
- Terminal-based interface using Commander.js
- Connects to local API server
- Quick access for developers who live in terminal
- Interactive chat mode in terminal

### Frontend 2: Web GUI
- **Next.js 15** (App Router) + TypeScript
- **TailwindCSS** for modern, responsive UI
- **shadcn/ui** for pre-built components (optional, but recommended)
- **Monaco Editor** (VS Code editor) for code preview with syntax highlighting
- Runs at http://localhost:3001
- Calls backend API at localhost:3000

---

## Technology Stack

### Backend (`/api`)
```json
{
  "core": [
    "Node.js 20+",
    "TypeScript 5.6",
    "Express.js (REST API)",
    "ws (WebSocket for real-time chat)",
    "@anthropic-ai/sdk"
  ],
  "storage": [
    "better-sqlite3 (index database)",
    "SQLite FTS5 (full-text search)"
  ],
  "parsing": [
    "tree-sitter (AST parsing)",
    "ignore (gitignore support)",
    "glob (file scanning)"
  ],
  "utilities": [
    "chokidar (file watching)",
    "zod (validation)",
    "dotenv (config)"
  ]
}
```

### CLI Frontend (`/cli`)
```json
{
  "interface": [
    "commander (CLI framework)",
    "inquirer (interactive prompts)",
    "chalk (colors)",
    "ora (spinners)",
    "boxen (result boxes)"
  ],
  "api-client": [
    "axios (HTTP client)"
  ]
}
```

### Web Frontend (`/web`)
```json
{
  "framework": [
    "Next.js 15 (App Router)",
    "React 18",
    "TypeScript"
  ],
  "ui": [
    "TailwindCSS 4.x (styling)",
    "shadcn/ui (component library)",
    "lucide-react (icons)",
    "sonner (toast notifications)"
  ],
  "code-display": [
    "@monaco-editor/react (VS Code editor)",
    "shiki (syntax highlighting)"
  ],
  "data": [
    "axios (API calls)",
    "socket.io-client (WebSocket)",
    "zustand (state management)"
  ],
  "visualization": [
    "recharts (charts for statistics)",
    "react-flow (repository graph visualization)"
  ]
}
```

---

## Project Structure

```
/Users/cb/Apps/cbroberg/codescan/
│
├── packages/
│   ├── api/                          # Backend API Server
│   │   ├── src/
│   │   │   ├── server.ts             # Express app setup
│   │   │   ├── routes/
│   │   │   │   ├── index.ts          # API routes registration
│   │   │   │   ├── indexing.ts       # POST /api/index, GET /api/index/status
│   │   │   │   ├── search.ts         # POST /api/search
│   │   │   │   ├── chat.ts           # WebSocket /api/chat
│   │   │   │   ├── repositories.ts   # GET /api/repositories
│   │   │   │   └── config.ts         # GET/PUT /api/config
│   │   │   ├── services/
│   │   │   │   ├── indexer/
│   │   │   │   │   ├── index-manager.ts
│   │   │   │   │   ├── file-scanner.ts
│   │   │   │   │   ├── parsers/
│   │   │   │   │   │   ├── typescript-parser.ts
│   │   │   │   │   │   ├── python-parser.ts
│   │   │   │   │   │   └── generic-parser.ts
│   │   │   │   │   ├── chunker.ts
│   │   │   │   │   └── watcher.ts
│   │   │   │   ├── search/
│   │   │   │   │   ├── search-engine.ts
│   │   │   │   │   ├── semantic-matcher.ts
│   │   │   │   │   ├── keyword-matcher.ts
│   │   │   │   │   ├── ranker.ts
│   │   │   │   │   └── context-builder.ts
│   │   │   │   ├── ai/
│   │   │   │   │   ├── claude-client.ts
│   │   │   │   │   └── prompts.ts
│   │   │   │   └── storage/
│   │   │   │       ├── database.ts
│   │   │   │       ├── schema.ts
│   │   │   │       └── repositories/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli/                          # CLI Interface
│   │   ├── src/
│   │   │   ├── index.ts              # Entry point
│   │   │   ├── commands/
│   │   │   │   ├── server.ts         # Start API server
│   │   │   │   ├── init.ts           # Initialize config
│   │   │   │   ├── index.ts          # Build index
│   │   │   │   ├── search.ts         # One-off search
│   │   │   │   └── chat.ts           # Interactive chat
│   │   │   ├── client/
│   │   │   │   └── api-client.ts     # API communication
│   │   │   └── ui/
│   │   │       └── formatters.ts     # Result formatting
│   │   ├── package.json
│   │   └── bin/
│   │       └── codescan.js
│   │
│   └── web/                          # Web GUI (Next.js)
│       ├── app/                      # Next.js App Router
│       │   ├── layout.tsx            # Root layout with Sidebar
│       │   ├── page.tsx              # Dashboard (/)
│       │   ├── search/
│       │   │   └── page.tsx          # Search page
│       │   ├── chat/
│       │   │   └── page.tsx          # Chat page
│       │   ├── repositories/
│       │   │   └── page.tsx          # Repository management
│       │   ├── settings/
│       │   │   └── page.tsx          # Settings page
│       │   └── globals.css           # Global styles + Tailwind
│       ├── components/
│       │   ├── layout/
│       │   │   ├── sidebar.tsx
│       │   │   └── header.tsx
│       │   ├── search/
│       │   │   ├── search-bar.tsx
│       │   │   ├── filter-panel.tsx
│       │   │   ├── result-list.tsx
│       │   │   ├── result-card.tsx
│       │   │   └── code-preview.tsx
│       │   ├── chat/
│       │   │   ├── chat-interface.tsx
│       │   │   ├── message-list.tsx
│       │   │   └── message-input.tsx
│       │   ├── dashboard/
│       │   │   ├── stats-cards.tsx
│       │   │   ├── repo-grid.tsx
│       │   │   ├── technology-chart.tsx
│       │   │   └── recent-searches.tsx
│       │   └── ui/                   # shadcn/ui components
│       │       ├── button.tsx
│       │       ├── card.tsx
│       │       ├── input.tsx
│       │       └── ...
│       ├── lib/
│       │   ├── api-client.ts         # API calls to backend
│       │   ├── websocket.ts          # WebSocket client
│       │   ├── store.ts              # Zustand store
│       │   └── utils.ts              # Utilities
│       ├── hooks/
│       │   ├── use-search.ts
│       │   ├── use-chat.ts
│       │   └── use-repositories.ts
│       ├── public/
│       ├── next.config.ts
│       ├── package.json
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── components.json           # shadcn/ui config
│
├── shared/                           # Shared types between packages
│   ├── types/
│   │   ├── api.types.ts
│   │   ├── search.types.ts
│   │   └── config.types.ts
│   └── package.json
│
├── package.json                      # Root package.json (monorepo)
├── pnpm-workspace.yaml              # PNPM workspace config
└── turbo.json                        # Turborepo config (optional)
```

---

## Core Features

### 1. Indexing System
**Location:** `packages/api/src/services/indexer/`

**Process:**
1. Scan configured directories for code files
2. Parse files using tree-sitter (TypeScript, Python, JavaScript, etc.)
3. Extract:
   - Functions, classes, methods
   - Imports and dependencies
   - Technology stack (package.json, requirements.txt)
   - Repository metadata
4. Split into semantic chunks (function-level preferred)
5. Store in SQLite database with FTS5 indexes

**Database Schema:**
```sql
-- Repositories
CREATE TABLE repositories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  last_indexed DATETIME,
  file_count INTEGER,
  metadata JSON  -- package.json, tech stack
);

-- Files
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  repo_id TEXT,
  path TEXT NOT NULL,
  language TEXT,
  last_modified DATETIME,
  hash TEXT,
  metadata JSON,
  FOREIGN KEY (repo_id) REFERENCES repositories(id)
);

-- Code chunks (searchable units)
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  file_id TEXT,
  repo_id TEXT,
  chunk_type TEXT,  -- function, class, module
  name TEXT,
  start_line INTEGER,
  end_line INTEGER,
  content TEXT,
  context TEXT,
  search_text TEXT,
  FOREIGN KEY (file_id) REFERENCES files(id)
);

-- Technology index
CREATE TABLE technologies (
  id TEXT PRIMARY KEY,
  repo_id TEXT,
  name TEXT,
  version TEXT,
  category TEXT,
  FOREIGN KEY (repo_id) REFERENCES repositories(id)
);

-- Full-text search
CREATE VIRTUAL TABLE chunks_fts USING fts5(
  chunk_id,
  content,
  metadata
);
```

### 2. Two-Stage Search Engine
**Location:** `packages/api/src/services/search/`

**Stage 1: Keyword Pre-filtering**
- Use SQLite FTS5 for fast keyword matching
- Filter by technology stack (exact match)
- Filter by file type, repository
- **Result:** 100-1000 candidate chunks in <100ms

**Stage 2: Semantic Analysis**
- Batch candidates (20 per API call)
- Send to Claude API with context
- Claude scores relevance (0-100) and explains reasoning
- **Result:** Top 20-50 relevant matches

**Prompt Template:**
```
Query: "{user_query}"

Analyze these code chunks for relevance:
[Chunk 1: repo/file.ts:10-50]
{code}

[Chunk 2: repo/file.py:100-150]
{code}

For each chunk respond with:
- relevance_score (0-100)
- reason (why it matches)
- key_technologies (found in code)
```

**Ranking Formula:**
```typescript
score =
  claude_semantic_score * 0.5 +
  keyword_match_quality * 0.2 +
  file_recency * 0.1 +
  code_simplicity * 0.1 +
  exact_tech_match * 0.1
```

### 3. API Endpoints

**Indexing:**
- `POST /api/index/build` - Build full index
- `POST /api/index/incremental` - Update changed files
- `GET /api/index/status` - Get indexing progress
- `POST /api/index/watch/start` - Start file watcher
- `POST /api/index/watch/stop` - Stop file watcher

**Search:**
- `POST /api/search` - Perform semantic search
  ```json
  {
    "query": "Microsoft Teams notifications",
    "filters": {
      "technologies": ["teams-sdk"],
      "repositories": ["teams-app"],
      "languages": ["typescript"]
    },
    "maxResults": 20
  }
  ```
- `GET /api/search/history` - Recent searches

**Repositories:**
- `GET /api/repositories` - List all indexed repos
- `GET /api/repositories/:id` - Get repo details
- `GET /api/repositories/:id/technologies` - List tech stack

**Chat:**
- `WebSocket /api/chat` - Real-time chat interface
  - Send: `{ type: "message", content: "..." }`
  - Receive: `{ type: "response", content: "..." }`
  - Receive: `{ type: "results", data: [...] }`

**Configuration:**
- `GET /api/config` - Get current config
- `PUT /api/config` - Update config
- `POST /api/config/validate` - Validate config

### 4. Web GUI Features

#### Dashboard Page (`/`)
- **Stats Cards:**
  - Total repositories indexed
  - Total files scanned
  - Lines of code indexed
  - Last index update time
- **Repository Grid:** Visual cards for each repo with:
  - Repo name and path
  - Technology badges
  - File count, LOC
  - Last modified
- **Technology Chart:** Bar chart showing most used technologies
- **Recent Searches:** Quick access to previous queries

#### Search Page (`/search`)
- **Search Bar:** Large, prominent search input
- **Filter Panel:** (Left sidebar)
  - Technology checkboxes (React, Vue, Teams SDK, etc.)
  - Language dropdowns (TypeScript, Python, etc.)
  - Repository multi-select
  - Date range slider
- **Results List:** (Main area)
  - Repository-grouped results
  - Each result shows:
    - File path (clickable)
    - Code snippet with syntax highlighting
    - Relevance score badge
    - Context lines before/after
- **Code Preview Panel:** (Right sidebar, opens on click)
  - Full Monaco editor view
  - Syntax highlighting
  - Line numbers
  - Jump to definition (if available)

#### Chat Page (`/chat`)
- **Chat Interface:**
  - WhatsApp/ChatGPT-like design
  - User messages on right (blue)
  - AI responses on left (gray)
  - Code results embedded inline
- **Message Input:**
  - Large text area
  - Send button
  - "Searching..." animation during query
- **Real-time Streaming:**
  - AI responses stream word-by-word
  - Results appear as found
  - Loading indicators

#### Repositories Page (`/repositories`)
- **Table View:**
  - All indexed repositories
  - Columns: Name, Path, Files, LOC, Technologies, Last Indexed
  - Actions: Re-index, Remove, Open in Finder
- **Add Repository:**
  - Button to add new directory
  - Directory picker
  - Configure exclusions

#### Settings Page (`/settings`)
- **Search Paths:** Add/remove directories to index
- **Indexing Options:**
  - File extensions to include
  - Exclude patterns
  - Chunk size settings
  - Auto-watch toggle
- **AI Settings:**
  - Claude API key input
  - Model selection (Haiku, Sonnet, Opus)
  - Temperature slider
  - Max tokens
- **Storage:**
  - Database location
  - Clear cache button
  - Export/import config

---

## User Flows

### Flow 1: First-Time Setup (Web GUI)
1. User opens http://localhost:3001
2. Welcome screen: "No repositories indexed yet"
3. Click "Add Directory" button
4. Choose directory (e.g., ~/projects)
5. Configure exclusions (node_modules, .git)
6. Click "Start Indexing"
7. Progress bar shows indexing status
8. When done: Dashboard shows statistics

### Flow 2: Semantic Search (Web GUI)
1. User goes to Search page
2. Types: "Microsoft Teams notification implementation"
3. (Optional) Filters: Technology = "teams-sdk"
4. Clicks Search
5. Results load progressively
6. Grouped by repository:
   - **teams-integration-app** (3 matches)
     - `src/notifications/teams-notifier.ts:45-89`
       ```typescript
       // Code snippet with highlighting
       ```
       Relevance: 92% | "Uses Teams SDK adaptive cards"
7. Click result → Code Preview opens on right
8. Can navigate file, see full context

### Flow 3: Chat Mode (Web GUI)
1. User opens Chat page
2. Types: "Where did I implement push notifications?"
3. AI responds: "I found push notification implementations in 3 repositories. Would you like to see Teams-specific notifications or general push notifications?"
4. User: "Teams notifications"
5. AI searches and embeds results in chat
6. User: "Show me the first one in detail"
7. AI displays full code with explanation

### Flow 4: CLI Usage
```bash
# Start API server (runs in background)
codescan server start

# Initialize config
codescan init
# Prompts for directories

# Build index
codescan index
# [=====>] Indexing: 1,234 files (45s)

# One-off search
codescan search "Teams SDK notifications"
# Displays top results in terminal

# Interactive chat
codescan chat
> Find code using Teams SDK
[Results in terminal]
> Show the first one
[Full code displayed]
```

---

## Implementation Steps

### Phase 1: Backend Foundation (Week 1)
**Critical Files:**
- `packages/api/src/server.ts` - Express server setup
- `packages/api/src/services/storage/database.ts` - SQLite wrapper
- `packages/api/src/services/storage/schema.ts` - Database schema
- `packages/shared/types/` - Shared type definitions

**Tasks:**
1. Setup monorepo with PNPM workspaces
2. Initialize packages: api, cli, web, shared
3. Configure TypeScript for all packages
4. Create SQLite database with schema
5. Setup Express server with basic routes
6. Create shared type definitions

### Phase 2: Indexing System (Week 1-2)
**Critical Files:**
- `packages/api/src/services/indexer/index-manager.ts`
- `packages/api/src/services/indexer/file-scanner.ts`
- `packages/api/src/services/indexer/parsers/typescript-parser.ts`
- `packages/api/src/services/indexer/chunker.ts`

**Tasks:**
1. Implement file scanner with ignore patterns
2. Setup tree-sitter for TypeScript/JavaScript parsing
3. Build chunking algorithm (function-level)
4. Extract metadata (imports, exports, tech stack)
5. Create indexing API endpoints
6. Add progress reporting

### Phase 3: Search Engine (Week 2)
**Critical Files:**
- `packages/api/src/services/search/search-engine.ts`
- `packages/api/src/services/search/semantic-matcher.ts`
- `packages/api/src/services/ai/claude-client.ts`
- `packages/api/src/services/search/ranker.ts`

**Tasks:**
1. Setup Claude API client
2. Implement keyword pre-filtering (SQLite FTS)
3. Build semantic matching with Claude
4. Create ranking algorithm
5. Implement context builder
6. Create search API endpoints

### Phase 4: CLI Interface (Week 3)
**Critical Files:**
- `packages/cli/src/index.ts`
- `packages/cli/src/commands/chat.ts`
- `packages/cli/src/commands/search.ts`

**Tasks:**
1. Setup Commander.js CLI framework
2. Implement API client
3. Create commands: init, index, search, chat
4. Build result formatters with chalk/boxen
5. Add interactive chat with inquirer
6. Create executable script

### Phase 5: Web GUI (Week 3-4)
**Critical Files:**
- `packages/web/app/layout.tsx`
- `packages/web/app/search/page.tsx`
- `packages/web/app/chat/page.tsx`
- `packages/web/components/search/code-preview.tsx`
- `packages/web/lib/api-client.ts`

**Tasks:**
1. Setup Next.js 15 + TypeScript project
2. Configure TailwindCSS + shadcn/ui
3. Create root layout with sidebar navigation
4. Build Dashboard page (`app/page.tsx`) with statistics
5. Implement Search page (`app/search/page.tsx`):
   - Search bar component
   - Filter panel
   - Results list
   - Code preview with Monaco Editor
6. Build Chat page (`app/chat/page.tsx`):
   - Chat interface with real-time messages
   - WebSocket integration
   - Message streaming
7. Create Repositories page (`app/repositories/page.tsx`)
8. Build Settings page (`app/settings/page.tsx`)
9. Setup API client in `lib/api-client.ts`

### Phase 6: Polish & Testing (Week 4-5)
**Tasks:**
1. Add file watcher for incremental updates
2. Implement caching for search results
3. Add error handling and logging
4. Write unit tests (Vitest)
5. Write integration tests
6. Performance optimization
7. Documentation (README, API docs)
8. Add example configurations

---

## Configuration Example

**~/.config/codescan/config.json:**
```json
{
  "searchPaths": [
    {
      "path": "/Users/cb/projects",
      "name": "My Projects",
      "exclude": ["**/node_modules/**", "**/dist/**", "**/.git/**"]
    }
  ],
  "indexing": {
    "fileExtensions": [".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".go"],
    "chunkSize": 300,
    "respectGitignore": true,
    "maxFileSize": 1048576
  },
  "search": {
    "maxResults": 20,
    "contextLines": 10,
    "minRelevanceScore": 50
  },
  "ai": {
    "model": "claude-3-5-sonnet-20241022",
    "maxTokens": 4096,
    "temperature": 0.3
  },
  "storage": {
    "dbPath": "~/.config/codescan/index.db",
    "enableWatcher": true
  },
  "server": {
    "apiPort": 3000,
    "webPort": 3001
  }
}
```

**Environment Variables (.env):**
```bash
ANTHROPIC_API_KEY=sk-ant-xxx
NODE_ENV=development
LOG_LEVEL=info
```

---

## Verification Plan

### End-to-End Testing

**Test 1: Indexing**
1. Start server: `codescan server start`
2. Add test directory via CLI: `codescan init`
3. Build index: `codescan index`
4. Verify in web GUI: Check Dashboard shows repositories
5. Verify database: Query SQLite to confirm data

**Test 2: CLI Search**
1. Run: `codescan search "authentication code"`
2. Verify results displayed in terminal
3. Check relevance scores are reasonable
4. Verify file paths are correct

**Test 3: Web Search**
1. Open http://localhost:3001/search
2. Search: "Microsoft Teams notifications"
3. Apply filter: Technology = "teams-sdk"
4. Click result → Code preview opens
5. Verify syntax highlighting works
6. Verify line numbers match source

**Test 4: Chat Interface**
1. Open http://localhost:3001/chat
2. Ask: "Where did I use React hooks?"
3. Verify AI responds and searches
4. Verify results embedded in chat
5. Test follow-up questions
6. Verify conversation context maintained

**Test 5: Incremental Updates**
1. Edit a file in indexed directory
2. Verify file watcher triggers
3. Check dashboard shows updated timestamp
4. Search for new content
5. Verify it appears in results

**Test 6: Performance**
1. Index large codebase (10k+ files)
2. Measure indexing time (should be <2min)
3. Run search query
4. Measure response time (should be <3s)
5. Verify database size is reasonable

---

## Success Metrics

**Indexing:**
- Time: <30s for 10,000 files
- Storage: <100MB for 100k LOC
- Accuracy: 95%+ files correctly parsed

**Search:**
- Latency: <3s for typical query
- Relevance: Top 5 results useful 80%+ of time
- Cost: <$0.01 per search (Claude API)

**User Experience:**
- Setup time: <5 minutes (first-time)
- Search satisfaction: "Better than grep/GitHub search"
- GUI responsiveness: <100ms interactions

---

## Critical Files Summary

The most critical files that define the architecture:

1. **packages/api/src/services/storage/schema.ts** - Database schema (foundation for everything)
2. **packages/api/src/services/indexer/index-manager.ts** - Core indexing logic
3. **packages/api/src/services/search/semantic-matcher.ts** - AI-powered search (the "brain")
4. **packages/api/src/server.ts** - API server that connects everything
5. **packages/web/app/search/page.tsx** - Main search UI (Next.js page)
6. **packages/web/app/chat/page.tsx** - Chat interface (Next.js page)
7. **packages/web/lib/api-client.ts** - Frontend API client
8. **packages/cli/src/commands/chat.ts** - CLI chat mode
9. **packages/shared/types/api.types.ts** - Shared contracts between frontend/backend

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                       User Interfaces                       │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                  │
│   CLI (Terminal)         │   Web GUI (Browser)              │
│   - Commander.js         │   - Next.js + TailwindCSS        │
│   - Inquirer prompts     │   - shadcn/ui components         │
│   - Chalk formatting     │   - Monaco Editor                │
│                          │                                  │
└────────────┬─────────────┴────────────┬─────────────────────┘
             │                          │
             │    HTTP/WebSocket        │
             │                          │
             └──────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │    Backend API Server        │
         │    - Express.js + TypeScript │
         │    - RESTful endpoints       │
         │    - WebSocket for chat      │
         │    - Runs on localhost:3000  │
         └──────────────┬───────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
         ▼              ▼              ▼
    ┌────────┐   ┌──────────┐   ┌─────────┐
    │ Indexer│   │  Search  │   │   AI    │
    │ System │   │  Engine  │   │ Claude  │
    └────┬───┘   └─────┬────┘   └────┬────┘
         │             │             │
         ▼             ▼             │
    ┌──────────────────────┐         │
    │   SQLite Database    │         │
    │   - Files & Chunks   │         │
    │   - FTS5 Search      │         │
    └──────────────────────┘         │
                                     │
                                     ▼
                            ┌─────────────────┐
                            │ Claude API      │
                            │ (External)      │
                            └─────────────────┘
```

**Key Points:**
- **Single Backend:** Both CLI and Web GUI call the same Express API
- **Shared Logic:** All business logic (indexing, search, AI) lives in backend
- **Clean Separation:** Frontends are thin clients that just render data
- **Local-First:** Everything runs on localhost except Claude API calls

---

## Notes

- **Monorepo:** Using PNPM workspaces for easier development and shared types
- **API-First:** Both CLI and Web share the same backend logic via REST API
- **Next.js Choice:** Using Next.js 15 with App Router for modern React patterns
- **shadcn/ui:** Pre-built, customizable components that work with TailwindCSS
- **TypeScript Everywhere:** Consistent type safety across all packages
- **Incremental Development:** Can start with backend + CLI, add Web GUI later
- **Extensibility:** Easy to add more parsers, UI features, or data sources later
- **Local-First:** Everything runs locally, no external services except Claude API
