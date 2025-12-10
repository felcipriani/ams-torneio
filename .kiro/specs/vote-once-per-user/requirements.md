# Requirements Document

## Introduction

This feature implements a vote-once-per-user system for the meme tournament application. The system prevents users from voting multiple times in the same duel by creating a unique session identifier based on the user's IPv4 address. This ensures fair voting while maintaining a seamless user experience across browser refreshes and different browsers on the same device.

## Glossary

- **Session Token**: A unique identifier generated from the user's IPv4 address that persists across browser sessions and refreshes
- **Vote Lock**: A server-side mechanism that prevents a user from voting more than once in a specific duel
- **Socket Connection Map**: A server-side data structure mapping session tokens to active WebSocket connection IDs
- **Client System**: The web browser and client-side application
- **Server System**: The backend WebSocket and HTTP server
- **Duel**: A single match between two memes in the tournament
- **IPv4 Address**: The Internet Protocol version 4 address of the user's network connection

## Requirements

### Requirement 1

**User Story:** As a tournament participant, I want my vote to be counted only once per duel, so that the voting results are fair and accurate.

#### Acceptance Criteria

1. WHEN a user votes in a duel THEN the Client System SHALL disable the vote buttons immediately for that user
2. WHEN a user has already voted in a duel THEN the Client System SHALL display the vote buttons as disabled upon page load
3. WHEN a user attempts to vote twice in the same duel THEN the Server System SHALL reject the duplicate vote
4. WHEN a user refreshes the page after voting THEN the Client System SHALL maintain the disabled state of vote buttons
5. WHEN a user opens the application in a different browser on the same device THEN the Server System SHALL recognize the user as having already voted based on IPv4 address

### Requirement 2

**User Story:** As a system administrator, I want user identification based on IPv4 addresses, so that users cannot bypass voting restrictions by changing browsers or clearing cookies.

#### Acceptance Criteria

1. WHEN a user first accesses the application THEN the Server System SHALL extract the user's IPv4 address from the connection
2. WHEN generating a session token THEN the Server System SHALL create a deterministic hash based on the IPv4 address
3. WHEN the same IPv4 address connects multiple times THEN the Server System SHALL generate identical session tokens
4. WHEN a session token is generated THEN the Client System SHALL store it in a cookie with appropriate expiration
5. WHERE a session token cookie exists THEN the Client System SHALL include it in all WebSocket communications

### Requirement 3

**User Story:** As a developer, I want to maintain a mapping of session tokens to active socket connections, so that the system can efficiently manage user sessions and deliver targeted updates.

#### Acceptance Criteria

1. WHEN a WebSocket connection is established THEN the Server System SHALL add the socket ID to the session token's connection list
2. WHEN a WebSocket connection is closed THEN the Server System SHALL remove the socket ID from the session token's connection list
3. WHEN a session token has multiple active connections THEN the Server System SHALL maintain all socket IDs in an array
4. WHEN broadcasting vote lock status THEN the Server System SHALL send updates only to socket connections associated with the voting user's session token
5. WHILE managing the connection map THEN the Server System SHALL ensure thread-safe operations to prevent race conditions

### Requirement 4

**User Story:** As a tournament participant, I want to receive immediate feedback when I vote, so that I know my vote was registered successfully.

#### Acceptance Criteria

1. WHEN a user submits a vote THEN the Server System SHALL send a vote confirmation message to that user's socket connections
2. WHEN a vote is locked for a user THEN the Server System SHALL broadcast the locked state only to that user's active connections
3. WHEN other users are viewing the same duel THEN the Server System SHALL NOT send vote lock notifications to those users
4. WHEN a vote lock message is received THEN the Client System SHALL update the UI to disable vote buttons
5. WHEN the duel advances to the next match THEN the Server System SHALL clear vote locks for the completed duel

### Requirement 5

**User Story:** As a system architect, I want the session token system to be secure and privacy-conscious, so that user data is protected while maintaining functionality.

#### Acceptance Criteria

1. WHEN hashing IPv4 addresses THEN the Server System SHALL use a cryptographic hash function with a server-side salt
2. WHEN storing session tokens THEN the Server System SHALL NOT store raw IPv4 addresses
3. WHEN transmitting session tokens THEN the Client System SHALL use secure cookie attributes (HttpOnly where appropriate, SameSite)
4. WHEN a tournament ends THEN the Server System SHALL clear all vote lock data for that tournament
5. WHERE session tokens are logged THEN the Server System SHALL NOT log raw IPv4 addresses or unhashed identifiers

### Requirement 6

**User Story:** As a tournament participant, I want the voting system to handle edge cases gracefully, so that I have a reliable experience even in unusual situations.

#### Acceptance Criteria

1. IF a user's IPv4 address cannot be determined THEN the Server System SHALL generate a fallback session token based on available connection metadata
2. WHEN a user is behind a proxy or NAT THEN the Server System SHALL extract the real IPv4 address from appropriate headers (X-Forwarded-For, X-Real-IP)
3. IF multiple users share the same IPv4 address THEN the Server System SHALL treat them as the same voter (expected behavior for shared networks)
4. WHEN the connection map grows large THEN the Server System SHALL implement cleanup of stale connections
5. WHEN a socket reconnects with the same session token THEN the Server System SHALL restore the user's vote lock state
