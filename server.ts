// CRITICAL: Load environment variables FIRST before any other imports
// This ensures process.env is populated before singleton instances are created
import './server/env';

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from './server/websocket';
import { sessionMiddleware } from './server/session-middleware';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const httpServer = createServer(async (req, res) => {
    try {
      // Apply session middleware before Next.js handler
      sessionMiddleware.handle(req, res);
      
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize WebSocket server
  const wsServer = new WebSocketServer(httpServer);

  // Start listening
  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
