# Product Overview

## Meme Championship Tournament

A real-time, interactive web application for running single-elimination meme tournaments. Users upload memes, an admin starts the tournament, and participants vote on head-to-head meme duels until a champion is crowned.

### Core Features

- **Meme Upload**: Users can upload meme images with captions
- **Tournament Bracket**: Automatic single-elimination bracket generation (supports 2+ memes, handles byes)
- **Real-time Voting**: Live head-to-head duels with timed voting periods
- **Admin Control**: Separate admin view to configure and start tournaments
- **Live Updates**: WebSocket-based real-time state synchronization across all clients
- **Bracket Visualization**: Visual representation of tournament progression

### User Flows

1. **Participant Flow**: Upload memes → Wait for tournament start → Vote in duels → See winner
2. **Admin Flow**: Access admin view → Configure voting time → Start tournament → Monitor progression

### Key Characteristics

- Multi-user real-time experience
- Tournament progresses automatically after each match timer expires
- Tie-breaking uses random selection
- Responsive design for mobile and desktop
