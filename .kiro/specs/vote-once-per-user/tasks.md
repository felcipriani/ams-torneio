# Implementation Plan: Vote-Once-Per-User System

- [x] 1. Implement Session Token Generator
  - Create `server/session-token.ts` with deterministic IPv4 hashing
  - Implement HMAC-SHA256 with server-side salt from environment variable
  - Implement IPv4 extraction from Socket.IO socket with proxy header support (X-Forwarded-For, X-Real-IP)
  - Implement fallback to socket.id when IPv4 unavailable
  - _Requirements: 2.1, 2.2, 2.3, 6.1, 6.2_

- [x] 1.1 Write property test for session token determinism
  - **Property 1: Session Token Determinism**
  - **Validates: Requirements 2.2, 2.3**

- [x] 1.2 Write property test for IPv4 extraction consistency
  - **Property 6: IPv4 Extraction Consistency**
  - **Validates: Requirements 6.2**

- [x] 2. Implement Connection Map Manager
  - Create `server/connection-map.ts` with bidirectional mapping
  - Implement `addConnection`, `removeConnection`, `getSocketIds`, `getSessionToken` methods
  - Use Map<sessionToken, Set<socketId>> and Map<socketId, sessionToken> data structures
  - Implement cleanup method for stale connections
  - _Requirements: 3.1, 3.2, 3.3, 6.4_

- [x] 2.1 Write property test for connection map consistency
  - **Property 3: Connection Map Consistency**
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 3. Implement Vote Lock Manager
  - Create `server/vote-lock-manager.ts` with vote tracking
  - Implement `hasVoted`, `recordVote`, `clearMatchLocks`, `clearAllLocks` methods
  - Use Map<matchId, Set<sessionToken>> data structure
  - Implement `getVotersForMatch` for debugging
  - _Requirements: 1.3, 4.5, 5.4_

- [x] 3.1 Write property test for vote lock enforcement
  - **Property 2: Vote Lock Enforcement**
  - **Validates: Requirements 1.3**

- [x] 3.2 Write property test for vote lock cleanup
  - **Property 5: Vote Lock Cleanup**
  - **Validates: Requirements 4.5**

- [x] 4. Implement Session Cookie Middleware
  - Create `server/session-middleware.ts` for HTTP request handling
  - Extract IPv4 from request headers
  - Generate session token using SessionTokenGenerator
  - Set cookie with secure attributes (httpOnly: false, secure in production, sameSite: strict, 7-day expiration)
  - Add environment variable `SESSION_TOKEN_SALT` to `.env.example`
  - _Requirements: 2.4, 5.3_

- [x] 4.1 Write property test for cookie persistence
  - **Property 7: Cookie Persistence**
  - **Validates: Requirements 2.4**

- [x] 5. Integrate middleware into Next.js server
  - Modify `server.ts` to apply session middleware before Next.js handler
  - Ensure middleware runs on all HTTP requests
  - Test cookie is set on first visit
  - _Requirements: 2.4_

- [x] 6. Enhance WebSocket Server with session tracking
  - Modify `server/websocket.ts` to integrate ConnectionMapManager, VoteLockManager, and SessionTokenGenerator
  - Extract session token from socket auth or generate from IPv4 on connection
  - Add socket to connection map on connect event
  - Remove socket from connection map on disconnect event
  - Implement `emitToUser` method to send events to all sockets of a session token
  - _Requirements: 3.1, 3.2, 3.4, 4.2_

- [x] 6.1 Write property test for targeted broadcast isolation
  - **Property 4: Targeted Broadcast Isolation**
  - **Validates: Requirements 4.2, 4.3**

- [x] 7. Implement vote lock checking in vote handler
  - Modify `handleVoteCast` in `server/websocket.ts` to check vote locks before processing
  - Extract session token from socket
  - Check if user has already voted using VoteLockManager
  - If already voted, emit `vote:rejected` error to user only
  - If not voted, process vote and record lock
  - Emit `vote:locked` event to user's sockets only after successful vote
  - _Requirements: 1.3, 4.1, 4.2_

- [ ] 7.1 Write property test for multi-browser same-IP detection
  - **Property 8: Multi-Browser Same-IP Detection**
  - **Validates: Requirements 1.5, 2.3**

- [x] 8. Clear vote locks on match completion
  - Modify `completeCurrentMatch` in `server/tournament-manager.ts` to call VoteLockManager.clearMatchLocks
  - Pass VoteLockManager instance to TournamentManager constructor
  - Clear locks for completed match before advancing to next match
  - _Requirements: 4.5_

- [x] 9. Clear all vote locks on tournament end
  - Modify tournament end logic in `server/tournament-manager.ts` to call VoteLockManager.clearAllLocks
  - Clear locks when status changes to TOURNAMENT_FINISHED
  - _Requirements: 5.4_

- [x] 10. Update client WebSocket hook to handle session tokens
  - Modify `hooks/useWebSocket.ts` to read session token from cookie
  - Implement `getSessionToken` helper function using `document.cookie`
  - Include session token in Socket.IO auth configuration
  - Add state for tracking if current user has voted
  - _Requirements: 2.5_

- [x] 11. Handle vote:locked event on client
  - Add `vote:locked` event listener in `hooks/useWebSocket.ts`
  - Update local state to mark user as having voted for current match
  - Expose `hasVotedInCurrentMatch` state from hook
  - _Requirements: 1.1, 4.4_

- [x] 12. Handle vote:rejected event on client
  - Add `vote:rejected` event listener in `hooks/useWebSocket.ts`
  - Display error message to user
  - Update local state to mark user as having voted
  - _Requirements: 1.3_

- [x] 13. Update DuelView component to disable buttons based on vote status
  - Modify `components/DuelView.tsx` to use `hasVotedInCurrentMatch` from hook
  - Disable vote buttons when user has voted
  - Add visual indication that user has already voted
  - Persist disabled state across component re-renders
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 14. Add new WebSocket message types to types
  - Update `types/index.ts` to include `VoteLockedMessage`, `VoteRejectedMessage`, `SocketAuth` interfaces
  - Document new event types
  - _Requirements: All_

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Add environment variable documentation
  - Update README.md or create .env.example with SESSION_TOKEN_SALT
  - Document how to generate secure salt (e.g., `openssl rand -hex 32`)
  - Document optional TRUSTED_PROXY_IPS configuration
  - _Requirements: 5.1_

- [ ] 17. Add security logging
  - Log duplicate vote attempts with session token (not raw IP)
  - Log IPv4 extraction failures
  - Ensure no raw IPv4 addresses are logged
  - _Requirements: 5.5_

- [ ]* 17.1 Write property test for no raw IP logging
  - **Property: Security Logging**
  - **Validates: Requirements 5.2, 5.5**

- [ ] 18. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
