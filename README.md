# CodeScan

AI-powered semantic code search tool for your local repositories. Find code by describing what you're looking for in natural language.

**Example:** "Where did I implement Microsoft Teams notifications?" or "Show me authentication logic using OAuth"

## Features

- 🔍 **Semantic Search**: AI-powered understanding of code intent, not just keyword matching
- 💬 **Interactive Chat**: Multi-turn conversation mode for exploratory code discovery
- 📦 **Local Indexing**: SQLite database with semantic chunking of functions and classes
- 🚀 **CLI Interface**: Terminal-based interaction for quick searches
- 🎨 **Web GUI**: Next.js dashboard (coming in Phase 5)
- 🔗 **VS Code Integration**: Click files to open directly in VS Code
- ⚡ **Fast**: Two-stage search (keyword pre-filter + semantic analysis) for speed
- 📊 **Technology Detection**: Automatically identifies tech stack in your repositories

## Quick Start

### Prerequisites

- **Node.js 20+** and **pnpm** (or npm)
- **ANTHROPIC_API_KEY** (Claude API key) in `.env`
- VS Code (optional, for file opening)

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd codescan
   pnpm install
   ```

2. **Create `.env` file** with your API key:
   ```bash
   cp .env.example .env
   # Edit .env and add your ANTHROPIC_API_KEY=sk-ant-...
   ```

3. **Build packages**:
   ```bash
   pnpm build
   ```

### Global CLI Installation (Optional)

To use `codescan` command directly instead of `pnpm cli`, link the CLI globally:

```bash
# Link CLI to system PATH
cd packages/cli
pnpm link --global

# Now you can use codescan from anywhere:
codescan init
codescan index
codescan search "your query"
codescan server start
```

If using npm instead of pnpm:
```bash
cd packages/cli
npm link
```

To unlink later:
```bash
pnpm unlink --global
# or: npm unlink -g codescan
```

## Usage

### Starting the API Server

The CLI commands need the backend API server running. Start it in one terminal:

**If using global CLI (recommended):**
```bash
codescan server start
```

**Or if using pnpm directly:**
```bash
pnpm server
# Or: pnpm cli server start
```

Server runs on `http://localhost:3000`

### Initializing CodeScan

Configure which directories to search:

**With global CLI:**
```bash
codescan init /path/to/your/code "My Code"
```

**Or with pnpm:**
```bash
pnpm cli init /path/to/your/code "My Code"
```

You'll be prompted to add directories. Example:
```
? Enter directory path: /Users/yourusername/projects
? Include subdirectories? Yes
? Add another directory? No
```

### Building the Index

Index your repositories (one-time or periodic):

**With global CLI:**
```bash
codescan index
```

**Or with pnpm:**
```bash
pnpm cli index
```

This scans files, extracts functions/classes, and builds the semantic search index. First run takes a minute or two depending on code volume.

### Searching Code

#### Quick Search
Search from command line:

**With global CLI:**
```bash
codescan search "Microsoft Teams notifications"
codescan search "authentication logic" --tech teams-sdk
codescan search "React hooks" --repo my-web-app --max 10
```

**Or with pnpm:**
```bash
pnpm cli search "Microsoft Teams notifications"
pnpm cli search "authentication logic" --tech teams-sdk
pnpm cli search "React hooks" --repo my-web-app --max 10
```

Options:
- `--tech <technology>` - Filter by tech (e.g., "react", "teams-sdk")
- `--repo <repository>` - Search specific repository
- `--lang <language>` - Filter by language (e.g., "typescript", "python")
- `--max <number>` - Maximum results (default: 20)

#### Interactive Chat
For exploratory searching with follow-ups:

**With global CLI:**
```bash
codescan chat
```

**Or with pnpm:**
```bash
pnpm cli chat
```

Example session:
```
> Find code using OAuth

🔍 Searching repositories...

Found 5 matches:
[auth-service] src/lib/oauth.ts - Login implementation
[web-app] src/auth/provider.ts - OAuth provider setup
...

> Show me the first one in detail
[Full code displayed with syntax highlighting]

> How does it integrate with the API?
[AI responds and searches for related code...]
```

### Checking Status

View indexing progress and statistics:

**With global CLI:**
```bash
codescan status
```

**Or with pnpm:**
```bash
pnpm cli status
```

Shows:
- Index status (indexing, ready)
- Total repositories, files, chunks
- Database size
- Recent searches

### Listing Repositories

See all indexed repositories:

**With global CLI:**
```bash
codescan repos
```

**Or with pnpm:**
```bash
pnpm cli repos
```

Shows repository name, path, file count, tech stack, and last indexed time.

## Configuration

CodeScan stores configuration in your home directory: `~/.config/codescan/config.json`

Auto-created on first run with defaults. You can edit manually or use `codescan init` to reconfigure.

Example configuration:
```json
{
  "searchPaths": [
    {
      "path": "/Users/yourusername/projects",
      "name": "My Projects",
      "exclude": ["node_modules", "dist", ".git"]
    }
  ],
  "search": {
    "maxResults": 20,
    "minRelevanceScore": 50
  },
  "ai": {
    "model": "claude-3-5-sonnet-20241022",
    "maxTokens": 4096
  }
}
```

## Architecture

**Monorepo structure** with three packages:

- **`packages/api`** - Express backend server with:
  - SQLite semantic indexing
  - Two-stage search engine
  - Claude API integration for semantic analysis
  - RESTful API endpoints
  - Chat session management

- **`packages/cli`** - Terminal interface:
  - Commands for indexing, searching, chatting
  - Interactive prompts with Inquirer
  - Formatted output with syntax highlighting
  - VS Code integration links

- **`packages/web`** - Next.js GUI (in development):
  - Dashboard with statistics
  - Search interface with filters
  - Interactive chat
  - Code preview with Monaco Editor
  - Repository management

- **`packages/shared`** - Shared TypeScript types used by all packages

## How It Works

### Two-Stage Search

1. **Stage 1 - Keyword Pre-filtering** (fast):
   - SQLite FTS5 full-text search
   - Filters ~100-1000 candidate code chunks in <100ms
   - Cheap (no API calls)

2. **Stage 2 - Semantic Analysis** (accurate):
   - Send top candidates to Claude API
   - AI scores relevance (0-100)
   - Explains why each result matches
   - Ranks by multiple signals: semantic score, keyword quality, recency, code simplicity, tech match

### Indexing Process

1. Scan configured directories for source code
2. Parse files using tree-sitter AST parser (TypeScript, JavaScript, Python, etc.)
3. Extract functions, classes, methods as semantic chunks
4. Detect technology stack (package.json, imports)
5. Store in SQLite with full-text search indexes
6. Watch for file changes (upcoming feature)

## Development

**Available npm scripts**:

```bash
# Start everything
pnpm dev              # Runs API + CLI in watch mode

# Run packages individually
pnpm api              # Just start API server
pnpm cli              # CLI commands in watch mode
pnpm web              # Start Next.js dev server (Phase 5)

# Build
pnpm build            # Build all packages
pnpm clean            # Remove dist/ folders

# Monorepo
pnpm turbo:run <task>  # Run task across all packages with Turborepo
```

## Environment Variables

Create `.env` in project root:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional (defaults shown)
NODE_ENV=development
API_PORT=3000
DB_PATH=~/.config/codescan/index.db
LOG_LEVEL=info
```

## Tips

- **CLI commands too long?** Use global CLI installation (see above) to use `codescan` command directly
- **First indexing slow?** That's normal. Depends on your code volume. 1000 files ≈ 30 seconds.
- **API key cost?** Semantic search uses Claude API. Cost depends on query complexity (~$0.01-$0.10 per search).
- **Want to re-index?** Just run `codescan index` or `pnpm cli index` again. It detects changes.
- **API not running?** Start it in another terminal with `codescan server start` or `pnpm server`
- **Something not working?** Check logs with `LOG_LEVEL=debug pnpm api` for detailed output.

## Next Steps

- Phase 5: Web GUI with dashboard and visual search interface
- Real-time file watching for incremental index updates
- Support for more languages (Go, Rust, Java)
- Code diff analysis and git blame integration
- Export search results to various formats

## License

MIT

