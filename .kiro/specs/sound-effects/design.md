# Sound Effects Feature Design

## Overview

This feature adds audio feedback to the meme tournament application to enhance user experience through auditory cues. The implementation will use the Web Audio API for efficient sound playback, with a custom React hook for managing audio resources and playback logic. Sound effects will be triggered at key interaction points: vote submission, tournament start, match/round transitions, and winner celebration.

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────┐
│                    React Components                      │
│  (DuelView, WaitingScreen, WinnerScreen)                │
└────────────────┬────────────────────────────────────────┘
                 │ uses
                 ▼
┌─────────────────────────────────────────────────────────┐
│              useSoundEffects Hook                        │
│  - Manages AudioContext                                  │
│  - Preloads sound files                                  │
│  - Provides playback functions                           │
│  - Handles browser autoplay policies                     │
└────────────────┬────────────────────────────────────────┘
                 │ loads
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Sound Assets (/public/sounds)               │
│  - vote.mp3                                              │
│  - tournament-start.mp3                                  │
│  - match-transition.mp3                                  │
│  - round-transition.mp3                                  │
│  - winner-celebration-1.mp3                              │
│  - winner-celebration-2.mp3                              │
└─────────────────────────────────────────────────────────┘
```

### Integration Points

1. **DuelView Component**: Plays vote sound when user clicks a meme
2. **WaitingScreen Component**: Plays tournament start sound when state changes from waiting to active
3. **Match/Round Transitions**: Detected via useWebSocket state changes, plays appropriate transition sound
4. **WinnerScreen Component**: Plays multiple celebration sounds on mount

## Components and Interfaces

### useSoundEffects Hook

A custom React hook that manages all sound effect functionality.

```typescript
interface SoundEffects {
  playVote: () => void;
  playTournamentStart: () => void;
  playMatchTransition: () => void;
  playRoundTransition: () => void;
  playWinnerCelebration: () => void;
  stopAll: () => void;
  isReady: boolean;
  error: string | null;
}

function useSoundEffects(): SoundEffects
```

**Responsibilities:**
- Initialize AudioContext on first user interaction (to comply with browser autoplay policies)
- Preload all sound files into memory as AudioBuffers
- Provide functions to play each sound effect
- Handle errors gracefully (missing files, browser restrictions)
- Manage concurrent sound playback
- Clean up resources on unmount

**Implementation Details:**
- Uses Web Audio API for low-latency playback
- Lazy initialization of AudioContext (created on first play attempt)
- Preloads sounds using fetch + ArrayBuffer + decodeAudioData
- Each play function creates a new AudioBufferSourceNode for concurrent playback
- Tracks loading state and errors

### Sound Asset Specifications

All sound files will be stored in `/public/sounds/` directory:

| File Name | Purpose | Max Duration | Max Size |
|-----------|---------|--------------|----------|
| vote.mp3 | Vote confirmation | 0.5s | 50KB |
| tournament-start.mp3 | Tournament begins | 2s | 80KB |
| match-transition.mp3 | Between matches | 1s | 60KB |
| round-transition.mp3 | Between rounds | 1.5s | 70KB |
| winner-celebration-1.mp3 | Winner screen (fanfare) | 3s | 100KB |
| winner-celebration-2.mp3 | Winner screen (applause) | 3s | 100KB |

**Audio Format:**
- MP3 format for broad browser compatibility
- Mono channel (stereo not needed for UI sounds)
- 128kbps bitrate
- 44.1kHz sample rate

### Component Modifications

#### DuelView Component

```typescript
// Add sound effect hook
const { playVote } = useSoundEffects();

// Modify vote handlers
const handleLeftVote = () => {
  if (isVotingEnabled) {
    playVote(); // Play sound immediately
    onVote(match.id, 'LEFT');
  }
};

const handleRightVote = () => {
  if (isVotingEnabled) {
    playVote(); // Play sound immediately
    onVote(match.id, 'RIGHT');
  }
};
```

#### WaitingScreen Component

```typescript
// Add sound effect hook and state tracking
const { playTournamentStart } = useSoundEffects();
const prevStateRef = useRef<string>('waiting');

// Detect transition from waiting to active
useEffect(() => {
  // This component only renders when state is null/waiting
  // When it unmounts and tournament starts, play sound
  return () => {
    playTournamentStart();
  };
}, [playTournamentStart]);
```

#### Main Page Component (app/page.tsx)

```typescript
// Add sound effect hook
const { playMatchTransition, playRoundTransition } = useSoundEffects();

// Track previous match/round to detect transitions
const prevMatchIdRef = useRef<string | null>(null);
const prevRoundIndexRef = useRef<number | null>(null);

useEffect(() => {
  if (!tournamentState?.currentMatch) return;
  
  const currentMatchId = tournamentState.currentMatch.id;
  const currentRoundIndex = tournamentState.currentMatch.roundIndex;
  
  // Detect match transition
  if (prevMatchIdRef.current && prevMatchIdRef.current !== currentMatchId) {
    // Check if round changed
    if (prevRoundIndexRef.current !== null && 
        prevRoundIndexRef.current !== currentRoundIndex) {
      playRoundTransition();
    } else {
      playMatchTransition();
    }
  }
  
  prevMatchIdRef.current = currentMatchId;
  prevRoundIndexRef.current = currentRoundIndex;
}, [tournamentState, playMatchTransition, playRoundTransition]);
```

#### WinnerScreen Component

```typescript
// Add sound effect hook
const { playWinnerCelebration, stopAll } = useSoundEffects();

useEffect(() => {
  // Play celebration sounds on mount
  playWinnerCelebration();
  
  // Stop all sounds on unmount
  return () => {
    stopAll();
  };
}, [playWinnerCelebration, stopAll]);
```

## Data Models

### AudioManager Class (Internal to Hook)

```typescript
class AudioManager {
  private context: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private loadingPromises: Map<string, Promise<void>> = new Map();
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  
  async initialize(): Promise<void>
  async loadSound(name: string, url: string): Promise<void>
  play(name: string): void
  stopAll(): void
  dispose(): void
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Acceptance Criteria Testing Prework

1.1 WHEN a participant clicks on a meme to vote during an active match THEN the Tournament System SHALL play a vote submission sound effect
  Thoughts: This is testing that a specific UI interaction triggers a sound. We can test this by simulating a vote action and verifying that the play function was called. This is testable as an example since it's a specific interaction.
  Testable: yes - example

1.2 WHEN the vote submission sound plays THEN the Tournament System SHALL complete playback within 1 second
  Thoughts: This is about timing constraints on sound playback. We can test this by measuring the duration of the audio buffer and ensuring it's under 1 second.
  Testable: yes - property

1.3 WHEN a participant votes multiple times in different matches THEN the Tournament System SHALL play the sound effect for each vote submission
  Thoughts: This tests that the sound can be played multiple times. We can test this by calling the play function multiple times and verifying each call succeeds.
  Testable: yes - property

1.4 WHEN the vote sound effect fails to load THEN the Tournament System SHALL allow voting to proceed without audio
  Thoughts: This is error handling - ensuring the app doesn't break when sounds fail. We can test this by mocking a failed sound load and verifying voting still works.
  Testable: yes - example

2.1 WHEN a participant is viewing the waiting screen AND the admin starts the tournament THEN the Tournament System SHALL play a tournament start sound effect
  Thoughts: This is a specific state transition that should trigger a sound. We can test this by simulating the state change and verifying the sound plays.
  Testable: yes - example

2.2 WHEN the tournament start sound plays THEN the Tournament System SHALL transition to the first match view
  Thoughts: This is about UI state management, not sound functionality. The sound should not block the transition.
  Testable: no

2.3 WHEN multiple participants are waiting THEN the Tournament System SHALL play the start sound for all participants simultaneously
  Thoughts: This is about multi-user behavior which is handled by the WebSocket broadcast. Each client independently plays the sound, so this is really testing that the sound plays when the state changes.
  Testable: yes - example

2.4 WHEN the start sound effect fails to load THEN the Tournament System SHALL proceed with tournament start without audio
  Thoughts: Error handling - app should work without sound. Similar to 1.4.
  Testable: yes - example

3.1 WHEN a match concludes and a new match begins THEN the Tournament System SHALL play a match transition sound effect
  Thoughts: This tests that match ID changes trigger the correct sound. We can test this by changing match IDs and verifying the sound plays.
  Testable: yes - example

3.2 WHEN a round concludes and a new round begins THEN the Tournament System SHALL play a round transition sound effect
  Thoughts: This tests that round index changes trigger the correct sound. We can test this by changing round indices and verifying the sound plays.
  Testable: yes - example

3.3 WHEN the transition sound plays THEN the Tournament System SHALL display the new match within 2 seconds
  Thoughts: This is about UI responsiveness, not sound functionality. The sound should not block the UI.
  Testable: no

3.4 WHEN transition sound effects fail to load THEN the Tournament System SHALL proceed with match progression without audio
  Thoughts: Error handling - app should work without sound.
  Testable: yes - example

4.1 WHEN the winner screen is displayed THEN the Tournament System SHALL play multiple celebratory sound effects
  Thoughts: This tests that the winner screen triggers multiple sounds. We can test this by rendering the component and verifying multiple play calls.
  Testable: yes - example

4.2 WHEN celebratory sounds play THEN the Tournament System SHALL include at least 2 distinct sound effects
  Thoughts: This is about the implementation detail of having multiple sounds. We can verify this by checking that at least 2 different sounds are played.
  Testable: yes - example

4.3 WHEN the winner screen loads THEN the Tournament System SHALL play sounds in a coordinated sequence or simultaneously
  Thoughts: This is about the timing/coordination of sounds. We can test this by verifying the play calls happen in the expected pattern.
  Testable: yes - example

4.4 WHEN celebratory sound effects fail to load THEN the Tournament System SHALL display the winner screen without audio
  Thoughts: Error handling - app should work without sound.
  Testable: yes - example

4.5 WHEN a participant navigates away from the winner screen THEN the Tournament System SHALL stop all playing sound effects
  Thoughts: This tests cleanup behavior. We can test this by unmounting the component and verifying stopAll was called.
  Testable: yes - example

5.1 WHEN any sound effect is triggered THEN the Tournament System SHALL use audio files smaller than 100KB each
  Thoughts: This is a constraint on the audio files themselves, not runtime behavior. We can verify file sizes.
  Testable: edge-case

5.2 WHEN sound effects are played THEN the Tournament System SHALL not block user interface interactions
  Thoughts: This is about non-blocking behavior. We can test that play functions return immediately (are not async or don't await).
  Testable: yes - property

5.3 WHEN a sound effect is already playing AND the same event triggers again THEN the Tournament System SHALL handle the overlap gracefully
  Thoughts: This tests concurrent playback. We can test by calling play multiple times rapidly and verifying no errors occur.
  Testable: yes - property

5.4 WHEN sound files are loaded THEN the Tournament System SHALL preload them during application initialization
  Thoughts: This is about when loading happens. We can test that sounds are loaded before they're needed.
  Testable: yes - example

5.5 WHEN a user's browser blocks autoplay THEN the Tournament System SHALL function normally without sound effects
  Thoughts: This is error handling for browser restrictions. We can test by mocking AudioContext creation failure.
  Testable: yes - example

### Property Reflection

After reviewing all testable criteria, most are specific examples of interactions rather than universal properties. The main properties that apply across multiple inputs are:

- **Property 1** (from 1.2): Sound duration constraint - applies to all sounds
- **Property 2** (from 1.3, 5.3): Multiple playback capability - applies to all sounds
- **Property 3** (from 5.2): Non-blocking behavior - applies to all play functions

The rest are specific examples or edge cases that should be tested as unit tests rather than property-based tests.

### Correctness Properties

Property 1: Sound duration constraint
*For any* loaded sound effect, the audio buffer duration should be less than or equal to its specified maximum duration (vote: 1s, tournament-start: 2s, match-transition: 1s, round-transition: 1.5s, celebrations: 3s each)
**Validates: Requirements 1.2**

Property 2: Concurrent playback capability
*For any* sound effect, calling the play function multiple times in rapid succession should not throw errors or fail, allowing overlapping playback
**Validates: Requirements 1.3, 5.3**

Property 3: Non-blocking playback
*For any* sound play function, the function should return immediately (synchronously) without blocking the JavaScript event loop
**Validates: Requirements 5.2**

## Error Handling

### Browser Autoplay Policy

Modern browsers block autoplay of audio until user interaction. The implementation will:

1. Defer AudioContext creation until first user interaction
2. Catch and log autoplay errors without breaking functionality
3. Set `isReady` flag to false if audio cannot be initialized
4. Allow all UI interactions to proceed normally even if audio fails

### Missing Sound Files

If sound files fail to load:

1. Log error to console for debugging
2. Continue with empty AudioBuffer for that sound
3. Play function becomes a no-op for missing sounds
4. Set error state in hook for optional error UI display
5. Application functionality remains unaffected

### AudioContext Limitations

- Maximum 6 concurrent AudioContexts per browser tab (varies by browser)
- Use single AudioContext for all sounds
- Reuse AudioBufferSourceNodes by creating new ones for each playback
- Clean up completed source nodes to prevent memory leaks

### Network Failures

- Implement retry logic for failed sound file fetches (max 3 retries)
- Use exponential backoff for retries
- Fall back to silent operation if all retries fail

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

1. **Hook initialization**: Verify hook returns expected interface
2. **Sound loading**: Test successful loading of sound files
3. **Error handling**: Test behavior when sounds fail to load
4. **Autoplay blocking**: Test behavior when AudioContext creation fails
5. **Component integration**: Test that components call sound functions at correct times
6. **Cleanup**: Test that stopAll and dispose are called on unmount
7. **State transitions**: Test that correct sounds play for each state change

**Test Files:**
- `hooks/useSoundEffects.test.ts` - Hook logic and audio management
- `components/DuelView.test.tsx` - Vote sound integration (extend existing test)
- `components/WinnerScreen.test.tsx` - Celebration sounds integration

### Property-Based Tests

Property-based tests will verify universal properties using fast-check:

1. **Property 1 (Sound duration)**: Generate random sound names and verify their buffers are within duration limits
2. **Property 2 (Concurrent playback)**: Generate random sequences of play calls and verify no errors occur
3. **Property 3 (Non-blocking)**: Generate random play function calls and verify they return synchronously

**Test File:**
- `hooks/useSoundEffects.properties.test.ts`

Each property test will run a minimum of 100 iterations and be tagged with:
```typescript
// Feature: sound-effects, Property 1: Sound duration constraint
// Feature: sound-effects, Property 2: Concurrent playback capability
// Feature: sound-effects, Property 3: Non-blocking playback
```

### Manual Testing

1. Test in multiple browsers (Chrome, Firefox, Safari, Edge)
2. Test with browser autoplay policies (strict vs permissive)
3. Test with slow network (throttle to verify loading states)
4. Test with missing sound files (404 errors)
5. Test audio quality and volume levels
6. Test on mobile devices (iOS Safari, Chrome Android)

## Performance Considerations

### Memory Usage

- All sounds preloaded into memory as AudioBuffers (~500KB total)
- AudioBuffers are immutable and shared across playbacks
- AudioBufferSourceNodes are one-time use and garbage collected after playback
- Total memory footprint: < 1MB

### CPU Usage

- Web Audio API uses hardware-accelerated audio processing
- Minimal CPU overhead for playback
- No impact on React rendering performance

### Network Usage

- All sounds loaded once on app initialization
- Total download size: ~500KB
- Cached by browser for subsequent visits
- No ongoing network usage after initial load

## Future Enhancements

1. **Volume Control**: Add user preference for sound effect volume
2. **Mute Toggle**: Allow users to disable all sounds
3. **Additional Sounds**: Add sounds for errors, notifications, etc.
4. **Sound Themes**: Allow different sound packs (retro, modern, etc.)
5. **Accessibility**: Add visual indicators that sync with sounds for hearing-impaired users
6. **Spatial Audio**: Use Web Audio API panning for directional effects
