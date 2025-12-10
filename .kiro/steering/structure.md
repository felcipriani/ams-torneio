# Project Structure

## Directory Organization

```
/app                    # Next.js App Router pages and API routes
  /admin-view          # Admin interface page
  /api                 # API route handlers
    /memes             # Meme CRUD endpoints
    /upload            # File upload endpoint
  globals.css          # Global styles
  layout.tsx           # Root layout
  page.tsx             # Main participant view

/components            # React components
  AdminDuelView.tsx    # Admin-specific duel display
  BracketVisualization.tsx  # Tournament bracket UI
  DuelView.tsx         # Participant duel voting UI
  ErrorBoundary.tsx    # Error handling wrapper
  MemeCard.tsx         # Individual meme display card
  MemeList.tsx         # List of uploaded memes
  Timer.tsx            # Countdown timer component
  TournamentConfig.tsx # Tournament configuration form
  UploadZone.tsx       # Drag-and-drop file upload
  WaitingScreen.tsx    # Pre-tournament waiting state
  WinnerScreen.tsx     # Tournament completion display
  index.ts             # Component exports

/hooks                 # Custom React hooks
  useWebSocket.ts      # WebSocket connection and state management

/lib                   # Utility functions
  utils.ts             # Helper functions (cn for classnames)

/server                # Server-side business logic
  in-memory-repository.ts      # In-memory data persistence
  in-memory-repository.test.ts # Repository tests
  repository-singleton.ts      # Singleton pattern for repository
  tournament-manager.ts        # Core tournament logic
  websocket.ts                 # WebSocket server implementation

/types                 # TypeScript type definitions
  index.ts             # All interfaces and types

/public/uploads        # Uploaded meme images (gitignored)

server.ts              # Custom server entry point
```

## Architecture Patterns

### Separation of Concerns

- **Client**: React components, hooks, UI logic
- **Server**: Business logic, WebSocket handling, data persistence
- **Types**: Shared type definitions between client and server

### Dependency Injection

The `TournamentManager` accepts an `ITournamentRepository` interface, enabling:
- Easy testing with mock repositories
- Swappable persistence mechanisms (in-memory, database, etc.)
- Liskov Substitution Principle compliance

### Repository Pattern

- `ITournamentRepository` interface defines data operations
- `InMemoryRepository` provides implementation
- `repository-singleton.ts` ensures single instance across server

### Real-time State Management

- Server maintains single source of truth
- WebSocket broadcasts state changes to all clients
- Clients receive updates via `useWebSocket` hook
- Optimistic UI updates not used (server-authoritative)

## File Naming Conventions

- **Components**: PascalCase (e.g., `DuelView.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useWebSocket.ts`)
- **Types**: camelCase for files, PascalCase for interfaces (e.g., `index.ts` contains `Match`, `Meme`)
- **Server modules**: kebab-case (e.g., `tournament-manager.ts`)
- **API routes**: Next.js convention (e.g., `[id]/route.ts`)

## Import Aliases

- `@/*` maps to project root (configured in `tsconfig.json`)
- Example: `import { Meme } from '@/types'`

## State Flow

1. User action (vote, start tournament) → Client emits WebSocket event
2. Server receives event → `WebSocketServer` validates and delegates to `TournamentManager`
3. `TournamentManager` updates state → Calls `onStateChange` callback
4. `WebSocketServer` broadcasts updated state → All clients receive update
5. Clients update UI via `useWebSocket` hook
