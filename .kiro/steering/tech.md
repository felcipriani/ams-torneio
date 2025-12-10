# Technology Stack

## Framework & Runtime

- **Next.js 14** (App Router) - React framework with server-side rendering
- **React 18** - UI library
- **TypeScript 5** - Type-safe JavaScript
- **Node.js** - Runtime environment

## Real-time Communication

- **Socket.IO 4** - WebSocket library for bidirectional real-time communication
- Custom WebSocket server integrated with Next.js HTTP server

## Styling & UI

- **Tailwind CSS 3** - Utility-first CSS framework
- **Framer Motion 11** - Animation library
- **Lucide React** - Icon library
- **tailwindcss-animate** - Additional animation utilities
- **clsx** & **tailwind-merge** - Utility for conditional class names

## File Handling

- **Formidable** - Multipart form data parsing for file uploads
- **Sharp** - Image processing

## Testing

- **Vitest** - Unit testing framework
- **fast-check** - Property-based testing
- **Playwright** - End-to-end testing
- **jsdom** - DOM implementation for testing

## Build & Development

- **tsx** - TypeScript execution for development server
- **ESLint** - Code linting
- **PostCSS** & **Autoprefixer** - CSS processing

## Common Commands

```bash
# Development
npm run dev          # Start development server (custom server with WebSocket)

# Building
npm run build        # Build for production
npm start            # Start production server

# Testing
npm test             # Run unit tests with Vitest

# Code Quality
npm run lint         # Run ESLint
```

## Development Server

The project uses a custom server (`server.ts`) that integrates:
- Next.js request handler
- HTTP server
- WebSocket server (Socket.IO)

Run with `npm run dev` which executes `tsx server.ts`.
