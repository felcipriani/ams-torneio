# Implementation Plan - Campeonato de Memes

- [x] 1. Initialize Next.js project with TypeScript and dependencies
  - Create Next.js 14+ project with App Router
  - Install dependencies: socket.io, socket.io-client, formidable, sharp, framer-motion, fast-check, vitest
  - Install and configure ShadCN UI with Tailwind CSS
  - Set up TypeScript configuration
  - Create basic folder structure: /app, /components, /server, /lib, /types
  - _Requirements: 8.1_

- [x] 2. Define core TypeScript types and interfaces
  - Create types for Meme, Match, Round, TournamentState
  - Create WebSocket message types (StateUpdateMessage, VoteCastMessage, etc.)
  - Create ITournamentRepository interface with all required methods
  - Export all types from /types/index.ts
  - _Requirements: 7.1, 10.1_

- [x] 3. Implement repository layer with in-memory implementation
  - [x] 3.1 Create ITournamentRepository interface
    - Define all methods: getState, setState, clearState, addMeme, getMemes, getMemeById, deleteMeme, updateMatch, getMatchById
    - _Requirements: 10.1, 10.3_
  
  - [x] 3.2 Implement InMemoryTournamentRepository
    - Use Map/object storage for state, memes, and matches
    - Implement all ITournamentRepository methods
    - _Requirements: 7.1, 10.2_
  
  - [ ]* 3.3 Write property test for repository round-trip
    - **Property 28: Repository Method Substitutability**
    - **Validates: Requirements 10.4**
    - Generate random tournament states, save and load, verify equality
    - _Requirements: 10.4_

- [ ] 4. Implement Tournament Manager with bracket generation
  - [ ] 4.1 Create TournamentManager class with repository injection
    - Constructor accepts ITournamentRepository
    - Initialize with empty state
    - _Requirements: 10.3, 10.5_
  
  - [ ] 4.2 Implement bracket generation algorithm
    - Generate single-elimination bracket for n memes (n≥2)
    - Calculate number of rounds: ceil(log2(n))
    - Create Match objects with proper pairings
    - Handle odd number of memes with byes
    - _Requirements: 4.4_
  
  - [ ]* 4.3 Write property test for bracket generation
    - **Property 13: Bracket Generation**
    - **Validates: Requirements 4.4**
    - Generate random meme sets (2-32 memes), verify bracket structure
    - _Requirements: 4.4_
  
  - [ ] 4.4 Implement initializeTournament method
    - Accept memes array and voting time
    - Generate bracket using algorithm from 4.2
    - Set initial state to DUEL_IN_PROGRESS
    - Start first match
    - Store state via repository
    - _Requirements: 4.4, 4.5_

- [ ] 5. Implement match progression and winner calculation
  - [ ] 5.1 Implement calculateWinner method
    - Compare vote counts
    - Return meme with higher votes
    - Handle ties with random selection
    - _Requirements: 5.3, 5.4_
  
  - [ ]* 5.2 Write property test for winner calculation
    - **Property 17: Winner Calculation**
    - **Validates: Requirements 5.3**
    - Generate matches with unequal votes, verify correct winner
    - _Requirements: 5.3_
  
  - [ ]* 5.3 Write property test for tie breaking
    - **Property 18: Tie Breaking**
    - **Validates: Requirements 5.4**
    - Generate matches with equal votes, verify winner is one of the two memes
    - _Requirements: 5.4_
  
  - [ ] 5.4 Implement advanceWinner method
    - Place winner in next round's match
    - Update bracket structure
    - _Requirements: 6.4_
  
  - [ ] 5.5 Implement tournament progression logic
    - Determine if more matches in current round
    - Advance to next round if current round complete
    - Set status to TOURNAMENT_FINISHED if final match
    - _Requirements: 5.5_
  
  - [ ]* 5.6 Write property test for tournament progression
    - **Property 19: Tournament Progression**
    - **Validates: Requirements 5.5**
    - Simulate match completions, verify correct progression
    - _Requirements: 5.5_

- [ ] 6. Implement timer and vote processing
  - [ ] 6.1 Implement timer mechanism
    - Create interval that decrements timeRemaining every second
    - Trigger match completion when time reaches 0
    - Clean up timer on match end
    - _Requirements: 7.4_
  
  - [ ]* 6.2 Write property test for timer decrement
    - **Property 25: Timer Decrement**
    - **Validates: Requirements 7.4**
    - Verify timer decrements at correct intervals
    - _Requirements: 7.4_
  
  - [ ] 6.3 Implement processVote method
    - Validate match is IN_PROGRESS
    - Validate timeRemaining > 0
    - Increment vote count for chosen side
    - Update match via repository
    - _Requirements: 2.5, 7.5_
  
  - [ ]* 6.4 Write property test for vote validation
    - **Property 6: Vote Rejection After Timeout**
    - **Validates: Requirements 2.5**
    - Generate votes with expired time, verify rejection
    - _Requirements: 2.5_

- [ ] 7. Implement WebSocket server
  - [ ] 7.1 Create WebSocket server with Socket.IO
    - Set up server in /server/websocket.ts
    - Handle connection and disconnection events
    - Track connected clients
    - _Requirements: 7.2_
  
  - [ ] 7.2 Implement state broadcasting
    - Create broadcastState method
    - Emit state:update to all connected clients
    - Call on every state change
    - _Requirements: 7.2_
  
  - [ ]* 7.3 Write property test for state broadcasting
    - **Property 24: State Change Broadcasting**
    - **Validates: Requirements 7.2**
    - Simulate state changes, verify all clients receive updates
    - _Requirements: 7.2_
  
  - [ ] 7.4 Implement vote:cast event handler
    - Parse vote message
    - Call TournamentManager.processVote
    - Broadcast updated state
    - _Requirements: 2.1_
  
  - [ ] 7.5 Implement admin:start event handler
    - Parse start message
    - Call TournamentManager.initializeTournament
    - Broadcast initial state
    - _Requirements: 4.5_
  
  - [ ]* 7.6 Write property test for tournament start broadcast
    - **Property 14: Tournament Start Broadcast**
    - **Validates: Requirements 4.5**
    - Verify all clients receive state with DUEL_IN_PROGRESS
    - _Requirements: 4.5_

- [ ] 8. Implement file upload API route
  - [ ] 8.1 Create POST /api/upload route
    - Parse multipart form data with formidable
    - Extract file from request
    - _Requirements: 3.1_
  
  - [ ] 8.2 Implement file validation
    - Check file size ≤ 5MB
    - Check MIME type is PNG, JPG, JPEG, or WEBP
    - Return specific error messages for failures
    - _Requirements: 3.2, 3.3, 3.4_
  
  - [ ]* 8.3 Write property test for file size validation
    - **Property 7: File Size Validation**
    - **Validates: Requirements 3.2**
    - Generate files of various sizes, verify validation
    - _Requirements: 3.2_
  
  - [ ]* 8.4 Write property test for file type validation
    - **Property 8: File Type Validation**
    - **Validates: Requirements 3.3**
    - Generate files with various MIME types, verify validation
    - _Requirements: 3.3_
  
  - [ ] 8.5 Implement file storage
    - Save valid files to /public/uploads
    - Generate unique filename with UUID
    - Use sharp for image processing
    - _Requirements: 3.5_
  
  - [ ] 8.6 Create meme record via repository
    - Generate Meme object with id, imageUrl, caption
    - Store via repository.addMeme
    - Return meme metadata in response
    - _Requirements: 3.5_

- [ ] 9. Create additional API routes
  - [ ] 9.1 Create GET /api/memes route
    - Retrieve memes from repository
    - Return JSON array
    - _Requirements: 3.5_
  
  - [ ] 9.2 Create DELETE /api/memes/[id] route
    - Delete meme from repository
    - Delete associated file from /public/uploads
    - Return success response
    - _Requirements: 3.5_

- [ ] 10. Implement WebSocket client hook
  - Create useWebSocket custom hook
  - Handle connection, disconnection, reconnection with exponential backoff
  - Subscribe to state:update events
  - Provide methods to emit vote:cast and admin:start events
  - Store current tournament state in React state
  - _Requirements: 1.3, 7.3_

- [ ]* 10.1 Write property test for UI state synchronization
  - **Property 1: UI State Synchronization**
  - **Validates: Requirements 1.3**
  - Generate random states, verify UI reflects them
  - _Requirements: 1.3_

- [ ] 11. Build public view UI components
  - [ ] 11.1 Create WaitingScreen component
    - Display "Sessão ainda não iniciada" message
    - Center content with full-screen layout
    - Add subtle animations
    - _Requirements: 1.1_
  
  - [ ] 11.2 Create Timer component
    - Display circular progress indicator
    - Show remaining time in seconds
    - Change color based on urgency (green → yellow → red)
    - _Requirements: 1.5_
  
  - [ ]* 11.3 Write property test for timer display
    - **Property 2: Timer Display Consistency**
    - **Validates: Requirements 1.5**
    - Generate states with various timeRemaining, verify display
    - _Requirements: 1.5_
  
  - [ ] 11.4 Create MemeCard component
    - Display image with aspect ratio preservation
    - Show caption below image
    - Add vote button
    - Display vote count badge
    - Add hover effects
    - _Requirements: 1.2_
  
  - [ ] 11.5 Create DuelView component
    - Display two MemeCard components side-by-side
    - Add Timer component
    - Handle vote button clicks
    - Emit vote:cast events via WebSocket
    - Disable vote buttons when time expires
    - Make responsive (stack vertically on mobile)
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 8.3_
  
  - [ ]* 11.6 Write property test for vote event emission
    - **Property 3: Vote Event Emission**
    - **Validates: Requirements 2.1**
    - Simulate clicks, verify correct events emitted
    - _Requirements: 2.1_
  
  - [ ]* 11.7 Write property test for vote button enablement
    - **Property 4: Vote Button Enablement**
    - **Validates: Requirements 2.2**
    - Generate states with various timeRemaining, verify button state
    - _Requirements: 2.2_
  
  - [ ] 11.8 Create WinnerScreen component
    - Display champion meme large and centered
    - Show "Meme do Ano" title
    - Add confetti animation with framer-motion
    - Display caption
    - _Requirements: 1.4_

- [ ] 12. Build public view page
  - Create app/page.tsx
  - Use useWebSocket hook to get tournament state
  - Conditionally render WaitingScreen, DuelView, or WinnerScreen based on state.status
  - Add responsive layout
  - _Requirements: 1.1, 1.2, 1.4_

- [ ] 13. Build admin view UI components
  - [ ] 13.1 Create UploadZone component
    - Implement drag-and-drop area
    - Add file input fallback
    - Support multiple file selection
    - Show upload progress indicators
    - Display error messages for invalid files
    - Call /api/upload for each file
    - _Requirements: 3.1, 3.4_
  
  - [ ] 13.2 Create MemeList component
    - Display grid of uploaded memes
    - Show preview thumbnails
    - Add editable caption fields
    - Add delete button for each meme
    - Call /api/memes/[id] for deletion
    - _Requirements: 3.5_
  
  - [ ]* 13.3 Write property test for meme preview display
    - **Property 10: Meme Preview Display**
    - **Validates: Requirements 3.5**
    - Generate uploaded memes, verify preview and caption field
    - _Requirements: 3.5_
  
  - [ ] 13.4 Create TournamentConfig component
    - Add input for voting time (seconds)
    - Add "Iniciar torneio" button
    - Disable button when fewer than 2 memes
    - Show tournament status indicator
    - Emit admin:start event on button click
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 13.5 Write property test for start button enablement
    - **Property 11: Start Button Enablement**
    - **Validates: Requirements 4.2**
    - Generate states with various meme counts, verify button state
    - _Requirements: 4.2_
  
  - [ ] 13.6 Create AdminDuelView component
    - Display current match with both memes
    - Show real-time vote counters
    - Display timer
    - Show match info (round, match index)
    - _Requirements: 5.1, 5.2_
  
  - [ ]* 13.7 Write property test for admin vote count display
    - **Property 16: Admin Vote Count Display**
    - **Validates: Requirements 5.2**
    - Generate states with various vote counts, verify display
    - _Requirements: 5.2_
  
  - [ ] 13.8 Create BracketVisualization component
    - Display tree structure of all matches
    - Show completed matches with winner highlighted
    - Show current match with pulsing border
    - Show upcoming matches grayed out
    - Add round labels
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ]* 13.9 Write property test for bracket visualization
    - **Property 20: Bracket Visualization**
    - **Validates: Requirements 6.2**
    - Generate states with completed matches, verify visualization
    - _Requirements: 6.2_

- [ ] 14. Build admin view page
  - Create app/admin-view/page.tsx
  - Use useWebSocket hook to get tournament state
  - Render UploadZone and MemeList when status is WAITING
  - Render TournamentConfig when status is WAITING
  - Render AdminDuelView and BracketVisualization when tournament is active
  - Add responsive layout
  - _Requirements: 4.1, 5.1, 6.1_

- [ ] 15. Add animations and polish
  - Implement meme entrance animations in DuelView (center → sides)
  - Add smooth transitions between tournament states
  - Add loading states for uploads
  - Add error boundaries for graceful error handling
  - Optimize images with next/image
  - _Requirements: 8.2, 8.5_

- [ ] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Perform exploratory testing with Playwright MCP
  - [ ] 17.1 Test initial state
    - Navigate to `/`
    - Verify waiting screen displays
    - Take screenshot
    - _Requirements: 9.1_
  
  - [ ] 17.2 Test admin setup flow
    - Navigate to `/admin-view`
    - Upload 4 test images
    - Add captions
    - Set voting time to 10 seconds
    - Verify start button enabled
    - Take screenshot
    - _Requirements: 9.2_
  
  - [ ] 17.3 Test tournament flow
    - Click "Iniciar torneio"
    - Verify public view shows first duel
    - Verify timer counts down
    - Cast votes
    - Verify vote counts update
    - Wait for match completion
    - Verify next match starts
    - Take screenshots
    - _Requirements: 9.3, 9.4_
  
  - [ ] 17.4 Test winner flow
    - Complete all matches
    - Verify winner screen displays
    - Verify "Meme do Ano" indicator
    - Take screenshot
    - _Requirements: 9.5_

- [ ] 18. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
