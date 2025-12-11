# Design Document

## Overview

This feature adds a tournament reset capability to the Meme Championship application. The reset function allows administrators to clear all tournament state, delete uploaded memes and their associated files, and return all connected clients to the waiting screen. This enables running multiple tournament sessions without restarting the server.

The reset operation is a critical administrative function that must be:
- Accessible at any time during the tournament lifecycle
- Complete in its cleanup (no residual data)
- Properly communicated to all connected clients
- Safe and atomic in execution

## Architecture

### Component Interaction Flow

```
Admin Interface → WebSocket Event → WebSocket Server → Tournament Manager → Repository
                                                     ↓
                                          File System Cleanup
                                                     ↓
                                          Broadcast Reset Event → All Clients
```

### Key Components

1. **Admin Interface** (`app/admin-view/page.tsx`)
   - Displays reset button
   - Emits `admin:reset` WebSocket event
   - Shows confirmation/error feedback

2. **WebSocket Server** (`server/websocket.ts`)
   - Handles `admin:reset` event
   - Coordinates reset operation
   - Broadcasts `tournament:reset` event to all clients

3. **Tournament Manager** (`server/tournament-manager.ts`)
   - Implements `resetTournament()` method
   - Clears tournament state
   - Returns list of image URLs to delete

4. **Repository** (`server/in-memory-repository.ts`)
   - Implements state clearing
   - Removes all memes and matches

5. **File System Module** (new utility)
   - Deletes uploaded image files
   - Handles file system errors gracefully

6. **Client Hook** (`hooks/useWebSocket.ts`)
   - Listens for `tournament:reset` event
   - Resets local state on reset notification

## Components and Interfaces

### New WebSocket Message Types

```typescript
/**
 * Reset tournament message sent from admin client to server
 */
export interface ResetTournamentMessage {
  type: 'admin:reset';
  payload: {};
}

/**
 * Tournament reset notification sent from server to all clients
 */
export interface TournamentResetMessage {
  type: 'tournament:reset';
  payload: {
    timestamp: Date;
  };
}
```

### Tournament Manager Extension

```typescript
class TournamentManager {
  /**
   * Reset tournament to initial state
   * Clears all state, stops timers, and returns image URLs for deletion
   * 
   * @returns Array of image URLs that need to be deleted from filesystem
   */
  async resetTournament(): Promise<string[]>;
}
```

### Repository Extension

```typescript
interface ITournamentRepository {
  /**
   * Clear all tournament state and data
   * Removes all memes, matches, and resets state to null
   */
  clearState(): Promise<void>;
}
```

### File System Utility

```typescript
/**
 * Delete uploaded meme images from filesystem
 * 
 * @param imageUrls - Array of image URLs (e.g., ['/uploads/abc.jpg'])
 * @returns Object with success count and errors
 */
async function deleteUploadedImages(imageUrls: string[]): Promise<{
  deletedCount: number;
  errors: Array<{ url: string; error: string }>;
}>;
```

## Data Models

No new data models are required. The reset operation works with existing types:
- `TournamentState` - Will be cleared
- `Meme` - All instances will be removed
- `Match` - All instances will be removed

## 
Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

After analyzing the acceptance criteria, I identified several redundant properties. Properties 2.1, 3.1, 3.3, and 3.5 are logically covered by other properties (1.4, 1.2, 3.2, and 1.3 respectively). The following properties represent the unique, non-redundant correctness guarantees:

Property 1: Repository state clearing
*For any* tournament state with memes and matches, when reset is triggered, the repository SHALL contain zero memes and zero matches.
**Validates: Requirements 1.2, 3.1**

Property 2: State returns to initial configuration
*For any* tournament state (waiting, in-progress, or finished), when reset is triggered, the resulting state SHALL match the initial pre-tournament configuration with status 'WAITING', empty memes array, empty bracket, null currentMatch, and null winner.
**Validates: Requirements 1.3, 3.5**

Property 3: All clients receive reset notification
*For any* set of connected clients, when reset is triggered, every client SHALL receive exactly one 'tournament:reset' event.
**Validates: Requirements 1.4, 2.1**

Property 4: File system cleanup
*For any* set of uploaded image files, when reset is triggered, all image files SHALL be deleted from the filesystem.
**Validates: Requirements 1.5**

Property 5: Client state transition
*For any* client state (waiting, voting, viewing results), when a reset event is received, the client SHALL transition to the waiting screen state.
**Validates: Requirements 2.2**

Property 6: Client local data clearing
*For any* client with cached tournament data, when a reset event is received, all locally cached tournament data SHALL be cleared.
**Validates: Requirements 2.3**

Property 7: Bracket structure clearing
*For any* tournament state with a bracket structure, when reset is triggered, the bracket array SHALL be empty.
**Validates: Requirements 3.4**

Property 8: Match history clearing
*For any* tournament state with match history, when reset is triggered, no matches SHALL exist in the state.
**Validates: Requirements 3.2**

## Error Handling

### Reset Operation Errors

1. **File Deletion Failures**
   - Individual file deletion errors should not fail the entire reset
   - Log errors for files that cannot be deleted
   - Continue with reset even if some files fail to delete
   - Return partial success information

2. **Repository Errors**
   - If repository clearing fails, rollback is not possible (operation is destructive)
   - Log error and return error response to admin
   - Clients should not receive reset notification if repository clearing fails

3. **WebSocket Broadcast Errors**
   - If broadcast fails for some clients, log the error
   - Do not retry automatically
   - Clients will sync on next connection or state request

### Client-Side Error Handling

1. **Reset Event Processing**
   - If client fails to process reset event, log error
   - Attempt to fetch current state from server
   - Show error message to user if state cannot be recovered

2. **Network Disconnection**
   - If client is disconnected during reset, it will receive current state on reconnection
   - WebSocket hook handles reconnection automatically

## Testing Strategy

### Unit Tests

Unit tests will cover specific scenarios and edge cases:

1. **Reset Button Visibility** (Example Test)
   - Verify reset button is present in admin interface
   - Verify button is enabled at all times

2. **Empty State Reset** (Edge Case)
   - Reset when no memes are uploaded
   - Verify operation completes without errors

3. **Reset During Active Match** (Edge Case)
   - Reset while a match is in progress with active timer
   - Verify timer is stopped and cleaned up

4. **File Deletion Error Handling** (Edge Case)
   - Simulate file deletion failure
   - Verify reset continues and logs error

5. **Upload After Reset** (Example Test)
   - Verify upload functionality works after reset
   - Verify new memes can be added to clean state

### Property-Based Tests

Property-based tests will verify universal properties across many random inputs:

1. **Property 1: Repository State Clearing**
   - Generate random tournament states with varying numbers of memes and matches
   - Trigger reset
   - Verify repository contains zero memes and matches
   - Run 100+ iterations with different state configurations

2. **Property 2: State Returns to Initial Configuration**
   - Generate random tournament states (WAITING, DUEL_IN_PROGRESS, TOURNAMENT_FINISHED)
   - Trigger reset
   - Verify state matches initial configuration exactly
   - Run 100+ iterations with different states

3. **Property 3: All Clients Receive Reset Notification**
   - Generate random number of connected clients (1-100)
   - Trigger reset
   - Verify each client received exactly one reset event
   - Run 100+ iterations with different client counts

4. **Property 4: File System Cleanup**
   - Generate random sets of test image files (1-50 files)
   - Trigger reset
   - Verify all files are deleted
   - Run 100+ iterations with different file sets

5. **Property 5: Client State Transition**
   - Generate random client states (waiting, voting, viewing results)
   - Send reset event
   - Verify client transitions to waiting screen
   - Run 100+ iterations with different initial states

6. **Property 6: Client Local Data Clearing**
   - Generate random cached tournament data
   - Send reset event
   - Verify all cached data is cleared
   - Run 100+ iterations with different cached data

7. **Property 7: Bracket Structure Clearing**
   - Generate random bracket structures (different sizes, rounds)
   - Trigger reset
   - Verify bracket array is empty
   - Run 100+ iterations with different brackets

8. **Property 8: Match History Clearing**
   - Generate random match histories (different numbers of matches, rounds)
   - Trigger reset
   - Verify no matches exist in state
   - Run 100+ iterations with different match histories

### Testing Framework

- **Unit Tests**: Vitest with jsdom for React component testing
- **Property-Based Tests**: fast-check library
- **Minimum Iterations**: 100 runs per property test
- **Test Tagging**: Each property test must include a comment with format:
  ```typescript
  // Feature: tournament-reset, Property 1: Repository state clearing
  ```

### Integration Testing

While not part of the core implementation, integration tests could verify:
- End-to-end reset flow from admin button click to client state update
- WebSocket communication during reset
- File system operations in realistic scenarios

## Implementation Notes

### Timer Cleanup

The `TournamentManager` maintains a timer interval that must be stopped during reset:
- Call `stopTimer()` method to clear the interval
- Ensure no dangling timers after reset

### Atomic Operations

The reset operation should be as atomic as possible:
1. Stop timers first
2. Clear repository state
3. Delete files (best effort, log errors)
4. Broadcast to clients only after successful repository clearing

### State Synchronization

After reset, all clients should be in sync:
- Broadcast reset event to all connected clients
- Clients that reconnect later will receive current (empty) state
- No special handling needed for disconnected clients

### File System Safety

File deletion should be safe and non-blocking:
- Use async file operations
- Handle ENOENT errors gracefully (file already deleted)
- Log but don't fail on permission errors
- Return summary of deletion results

## Security Considerations

1. **Admin Authorization**
   - Reset is a destructive operation
   - Should only be accessible from admin interface
   - Consider adding confirmation dialog in UI
   - Future: Add authentication/authorization checks

2. **File System Access**
   - Only delete files in `/public/uploads` directory
   - Validate file paths to prevent directory traversal
   - Use path.join() to construct safe paths

3. **Data Loss Prevention**
   - Reset is permanent and cannot be undone
   - Consider adding backup/export functionality in future
   - UI should clearly warn about data loss

## Performance Considerations

1. **File Deletion**
   - Delete files in parallel using Promise.all()
   - Set reasonable timeout for file operations
   - Don't block reset on slow file deletions

2. **WebSocket Broadcasting**
   - Use Socket.IO's built-in broadcast mechanism
   - Efficient for large numbers of connected clients
   - Non-blocking operation

3. **Repository Clearing**
   - In-memory repository clearing is fast (O(1))
   - Future database implementations should use efficient bulk delete

## Future Enhancements

1. **Confirmation Dialog**
   - Add "Are you sure?" confirmation before reset
   - Show count of memes and active participants

2. **Reset History**
   - Log reset events with timestamp and admin identifier
   - Useful for auditing and debugging

3. **Partial Reset**
   - Option to reset tournament but keep uploaded memes
   - Option to reset only bracket but keep memes

4. **Backup Before Reset**
   - Automatically backup state before reset
   - Allow restoring from backup

5. **Admin Authentication**
   - Require admin password or token for reset
   - Prevent accidental or malicious resets
