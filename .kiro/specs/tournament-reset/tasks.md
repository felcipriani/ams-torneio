# Implementation Plan

- [x] 1. Add reset message types to type definitions
  - Add `ResetTournamentMessage` interface for admin-to-server communication
  - Add `TournamentResetMessage` interface for server-to-client notification
  - Update `WebSocketMessage` union type to include new message types
  - _Requirements: 1.1, 1.4_

- [x] 2. Implement file system cleanup utility
  - Create `deleteUploadedImages()` function in new `server/file-utils.ts` module
  - Accept array of image URLs and delete corresponding files from `/public/uploads`
  - Handle errors gracefully (ENOENT, permissions) and return deletion summary
  - Use `Promise.all()` for parallel deletion
  - Validate paths to prevent directory traversal attacks
  - _Requirements: 1.5_

- [x] 2.1 Write property test for file deletion
  - **Property 4: File system cleanup**
  - **Validates: Requirements 1.5**

- [ ] 3. Extend TournamentManager with reset functionality
  - Add `resetTournament()` method to `TournamentManager` class
  - Stop active timers using `stopTimer()` method
  - Get list of image URLs from current state before clearing
  - Call `repository.clearState()` to remove all data
  - Return array of image URLs for deletion
  - _Requirements: 1.2, 1.3, 3.1, 3.2, 3.4, 3.5_

- [ ] 3.1 Write property test for repository state clearing
  - **Property 1: Repository state clearing**
  - **Validates: Requirements 1.2, 3.1**

- [ ] 3.2 Write property test for state reset to initial configuration
  - **Property 2: State returns to initial configuration**
  - **Validates: Requirements 1.3, 3.5**

- [ ] 3.3 Write property test for bracket clearing
  - **Property 7: Bracket structure clearing**
  - **Validates: Requirements 3.4**

- [ ] 3.4 Write property test for match history clearing
  - **Property 8: Match history clearing**
  - **Validates: Requirements 3.2**

- [ ] 3.5 Write unit test for timer cleanup during reset
  - Verify timer is stopped when reset is called during active match
  - Verify no dangling intervals after reset

- [ ]* 3.6 Write unit test for empty state reset
  - Verify reset works correctly when no memes are uploaded
  - Verify no errors occur with empty state

- [ ] 4. Add reset event handler to WebSocket server
  - Register `admin:reset` event handler in `WebSocketServer.registerSocketHandlers()`
  - Create `handleAdminReset()` method to process reset requests
  - Call `tournamentManager.resetTournament()` to get image URLs
  - Call file deletion utility with image URLs
  - Broadcast `tournament:reset` event to all connected clients using `io.emit()`
  - Send success/error response to admin client
  - _Requirements: 1.4, 2.1_

- [ ]* 4.1 Write property test for client notification broadcast
  - **Property 3: All clients receive reset notification**
  - **Validates: Requirements 1.4, 2.1**

- [ ]* 4.2 Write unit test for file deletion error handling
  - Simulate file deletion failure
  - Verify reset continues and logs error
  - Verify clients still receive reset notification

- [ ] 5. Update client WebSocket hook to handle reset events
  - Add `tournament:reset` event listener in `useWebSocket` hook
  - Clear local tournament state when reset event is received
  - Reset UI to waiting screen state
  - Clear any cached data (vote locks, match history)
  - _Requirements: 2.2, 2.3_

- [ ] 5.1 Write property test for client state transition
  - **Property 5: Client state transition**
  - **Validates: Requirements 2.2**

- [ ] 5.2 Write property test for client local data clearing
  - **Property 6: Client local data clearing**
  - **Validates: Requirements 2.3**

- [ ] 6. Add reset button to admin interface
  - Add "REINICIAR TORNEIO" button to admin view (`app/admin-view/page.tsx`)
  - Style button prominently (red/warning color to indicate destructive action)
  - Make button accessible at all times (not disabled based on tournament state)
  - Emit `admin:reset` WebSocket event on button click
  - _Requirements: 1.1_

- [ ] 7. Add reset feedback to admin interface
  - Show confirmation message on successful reset
  - Display error message with details if reset fails
  - Show loading state while reset is in progress
  - Ensure tournament configuration form is visible after reset
  - _Requirements: 4.1, 4.2, 4.3_

- [ ]* 7.1 Write unit test for reset button visibility
  - Verify reset button is present in admin interface
  - Verify button is enabled in all tournament states

- [ ]* 7.2 Write unit test for confirmation message display
  - Verify confirmation message appears after successful reset
  - Verify configuration form is visible after reset

- [ ]* 7.3 Write unit test for error message display
  - Simulate reset failure
  - Verify error message is displayed with details

- [ ] 8. Verify upload functionality after reset
  - Manually test that meme upload works after reset
  - Verify new tournament can be started with newly uploaded memes
  - Verify no residual data from previous tournament affects new tournament
  - _Requirements: 2.4_

- [ ]* 8.1 Write unit test for upload after reset
  - Verify upload functionality is enabled after reset
  - Verify new memes can be added to clean state

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
