# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development server (with Turbopack)
npm run dev

# Build for production
npm run build

# Run all tests
npm test

# Run a single test file
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx

# Lint
npm run lint

# Reset database
npm run db:reset

# Regenerate Prisma client after schema changes
npx prisma generate

# Create a new migration after schema changes
npx prisma migrate dev
```

## Environment

Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY`. Without it, a `MockLanguageModel` is used that returns static component code — useful for testing the UI without burning API credits.

Set `JWT_SECRET` in production; defaults to a hardcoded development key.

## Architecture

This is a Next.js 15 App Router application where users describe React components in a chat, and Claude generates them with live preview.

### Core data flow

1. User sends a message → `POST /api/chat` (`src/app/api/chat/route.ts`)
2. Server streams a response from Claude (via Vercel AI SDK `streamText`) using two tools:
   - `str_replace_editor` — creates/edits files in a `VirtualFileSystem`
   - `file_manager` — renames/deletes files
3. The client (`ChatContext`) receives tool call events and forwards them to `FileSystemContext.handleToolCall()`
4. `FileSystemContext` mutates the in-memory `VirtualFileSystem` and increments `refreshTrigger`
5. `PreviewFrame` responds to `refreshTrigger`, transforms all VFS files via Babel + blob URLs, and renders them in an sandboxed iframe

### Virtual File System (`src/lib/file-system.ts`)

`VirtualFileSystem` is an in-memory tree structure (no disk I/O). It is instantiated fresh on every API request (server-side) and maintained in React context (client-side). The two instances sync via tool call results streamed back to the client.

Serialization: `serialize()` → plain `Record<string, FileNode>` → JSON stored in Prisma `Project.data`. `deserializeFromNodes()` restores it.

### JSX Transform & Preview (`src/lib/transform/jsx-transformer.ts`)

Files in the VFS are transformed client-side using `@babel/standalone` (in-browser Babel). Each file becomes a blob URL. An ES module import map is injected into the preview iframe so `@/` aliases and relative imports resolve correctly. Third-party packages are served from `esm.sh`. Tailwind CSS is loaded via CDN inside the iframe.

The preview entry point is `/App.jsx` by default.

### AI Provider (`src/lib/provider.ts`)

`getLanguageModel()` returns either `anthropic("claude-haiku-4-5")` (when `ANTHROPIC_API_KEY` is set) or a `MockLanguageModel`. The mock streams a deterministic sequence of tool calls to create a simple component — useful for offline development.

### Authentication (`src/lib/auth.ts`, `src/middleware.ts`)

JWT-based auth stored in an `httpOnly` cookie. `getSession()` is server-only (uses Next.js `cookies()`). `verifySession()` works in middleware. Projects are only persisted for authenticated users; anonymous users can still generate components but nothing is saved.

### Contexts

- `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) — owns the client-side `VirtualFileSystem` instance, exposes file CRUD, and handles tool call dispatch
- `ChatContext` (`src/lib/contexts/chat-context.tsx`) — wraps Vercel AI SDK `useChat`, translates incoming tool call stream parts into `handleToolCall()` calls

### AI generation prompt (`src/lib/prompts/generation.tsx`)

Key constraints the AI must follow:
- Every project must have `/App.jsx` as its root entry point with a default export
- Use `@/` import alias for all non-library imports (e.g., `@/components/Button`)
- Style with Tailwind CSS only, no inline styles
- Do not create HTML files

### Database (Prisma + SQLite)

The database schema is defined in `prisma/schema.prisma` — reference it whenever you need to understand the structure of data stored in the database. The Prisma client is generated into `src/generated/prisma/`.

### Tests

Vitest + jsdom + React Testing Library. Tests live alongside source in `__tests__/` subdirectories. Run with `npm test` or target a specific file with `npx vitest run <path>`.

## Code Style

Use comments sparingly — only for complex or non-obvious logic.
