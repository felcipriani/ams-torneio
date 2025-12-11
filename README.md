# Meme Championship Tournament

A real-time, interactive web application for running single-elimination meme tournaments. Users upload memes, an admin starts the tournament, and participants vote on head-to-head meme duels until a champion is crowned.

## Features

- **Meme Upload**: Users can upload meme images with captions
- **Tournament Bracket**: Automatic single-elimination bracket generation
- **Real-time Voting**: Live head-to-head duels with timed voting periods
- **Vote-Once-Per-User**: IPv4-based session tracking prevents duplicate votes
- **Admin Control**: Separate admin view to configure and start tournaments
- **Live Updates**: WebSocket-based real-time state synchronization
- **Bracket Visualization**: Visual representation of tournament progression

## Technology Stack

- **Next.js 14** with App Router
- **React 18** with TypeScript
- **Socket.IO 4** for real-time communication
- **Tailwind CSS** for styling
- **Vitest** for unit testing
- **fast-check** for property-based testing

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (see [Environment Configuration](#environment-configuration))

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Environment Configuration

The application requires environment variables to be configured. Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

#### Required Environment Variables

##### `SESSION_TOKEN_SALT`

**Purpose**: A secure random salt used for hashing IPv4 addresses into session tokens. This enables the vote-once-per-user system while preserving user privacy.

**How to generate**:
```bash
openssl rand -hex 32
```

**Example**:
```bash
SESSION_TOKEN_SALT=random_hash
```

**Important notes**:
- Keep this value secret and never commit it to version control
- Use a different value for each environment (development, staging, production)
- Changing this value will invalidate all existing session tokens and reset vote locks

#### Optional Environment Variables

##### `TRUSTED_PROXY_IPS`

**Purpose**: Comma-separated list of trusted proxy IP addresses or CIDR ranges. Required when the application is deployed behind a load balancer, reverse proxy, or CDN.

**When to use**: 
- Your application is behind nginx, Apache, or another reverse proxy
- You're using a CDN like Cloudflare or AWS CloudFront
- You're deploying on platforms like Heroku, AWS ELB, or similar

**How it works**: The system will extract the real client IPv4 address from `X-Forwarded-For` or `X-Real-IP` headers only when the request originates from a trusted proxy IP.

**Examples**:
```bash
# Single IP
TRUSTED_PROXY_IPS=127.0.0.1

# Multiple IPs
TRUSTED_PROXY_IPS=127.0.0.1,10.0.0.1,192.168.1.1

# CIDR ranges
TRUSTED_PROXY_IPS=10.0.0.0/8,172.16.0.0/12

# Mixed
TRUSTED_PROXY_IPS=127.0.0.1,10.0.0.0/8,192.168.1.0/24
```

**Security note**: Only add IP addresses you trust. Incorrectly configured proxy IPs can allow IP spoofing attacks.

## Available Scripts

```bash
# Development
npm run dev          # Start development server with WebSocket support

# Building
npm run build        # Build for production
npm start            # Start production server

# Testing
npm test             # Run unit and property-based tests

# Code Quality
npm run lint         # Run ESLint
```

## Architecture

### Vote-Once-Per-User System

The application implements a sophisticated vote-once-per-user system that:

1. **Session Token Generation**: Hashes user IPv4 addresses with a server-side salt to create deterministic session tokens
2. **Connection Mapping**: Tracks multiple browser tabs/windows from the same user
3. **Vote Lock Management**: Prevents duplicate votes per match while allowing votes in subsequent matches
4. **Privacy-Preserving**: Never stores raw IP addresses, only hashed session tokens

### Real-time Communication

- Custom WebSocket server integrated with Next.js
- Server-authoritative state management
- Automatic state synchronization across all connected clients

## Project Structure

```
/app                    # Next.js App Router pages and API routes
/components            # React components
/hooks                 # Custom React hooks
/server                # Server-side business logic
  connection-map.ts    # Session token to socket mapping
  session-token.ts     # IPv4 hashing and token generation
  vote-lock-manager.ts # Vote tracking per match
  websocket.ts         # WebSocket server implementation
/types                 # TypeScript type definitions
/public/uploads        # Uploaded meme images
server.ts              # Custom server entry point
```

## Deployment

### Production Checklist

1. ✅ Generate and set `SESSION_TOKEN_SALT` in production environment
2. ✅ Configure `TRUSTED_PROXY_IPS` if behind a load balancer or CDN
3. ✅ Ensure `NODE_ENV=production` is set
4. ✅ Build the application: `npm run build`
5. ✅ Start the production server: `npm start`

### Security Considerations

- Session tokens use HMAC-SHA256 hashing with server-side salt
- Cookies use `secure` flag in production and `sameSite: strict`
- Raw IPv4 addresses are never stored or logged
- Vote locks are cleared after match completion

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]
