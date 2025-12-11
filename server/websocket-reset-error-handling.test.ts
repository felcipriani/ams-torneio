/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer, Server as HTTPServer } from 'http';
import { WebSocketServer } from './websocket';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import * as fileUtils from './file-utils';

/**
 * Unit tests for WebSocket reset error handling
 * 
 * These tests verify that the reset operation continues gracefully
 * even when file deletion fails, and that clients still receive
 * reset notifications.
 */

describe('WebSocket Reset Error Handling - Unit Tests', () => {
  let httpServer: HTTPServer;
  let wsServer: WebSocketServer;
  let port: number;

  beforeEach(async () => {
    // Create HTTP server
    httpServer = createServer();
    
    // Create WebSocket server
    wsServer = new WebSocketServer(httpServer);

    // Find available port and start server
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        if (address && typeof address === 'object') {
          port = address.port;
          resolve();
        }
      });
    });
  });

  afterEach(async () => {
    // Restore all mocks
    vi.restoreAllMocks();

    // Close all connections
    await new Promise<void>((resolve) => {
      const io = wsServer.getIO();
      io.close(() => {
        httpServer.close(() => {
          resolve();
        });
      });
    });
  });

  /**
   * Helper to create a client connection
   */
  async function createClient(): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const client = ioClient(`http://localhost:${port}`);

      client.on('connect', () => {
        resolve(client);
      });

      client.on('connect_error', (error) => {
        reject(error);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);
    });
  }

  /**
   * Helper to wait for an event with timeout
   */
  function waitForEvent(client: ClientSocket, event: string, timeout: number = 3000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      client.once(event, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  // ============================================================================
  // Unit Tests
  // ============================================================================

  it('should continue reset and notify clients even when file deletion fails', async () => {
    // Mock deleteUploadedImages to simulate file deletion failure
    const mockDeleteUploadedImages = vi.spyOn(fileUtils, 'deleteUploadedImages');
    mockDeleteUploadedImages.mockResolvedValue({
      deletedCount: 0,
      errors: [
        { url: '/uploads/test1.jpg', error: 'Permission denied' },
        { url: '/uploads/test2.jpg', error: 'File not found' }
      ]
    });

    // Create test clients
    const client1 = await createClient();
    const client2 = await createClient();

    try {
      // Wait for connections to be established
      await new Promise(resolve => setTimeout(resolve, 300));

      // Set up listeners for reset events
      const resetPromise1 = waitForEvent(client1, 'tournament:reset', 5000);
      const resetPromise2 = waitForEvent(client2, 'tournament:reset', 5000);

      // Trigger reset
      client1.emit('admin:reset', {});

      // Wait for reset events to be received
      const [resetData1, resetData2] = await Promise.all([resetPromise1, resetPromise2]);

      // Verify both clients received the reset notification
      expect(resetData1).toHaveProperty('timestamp');
      expect(resetData2).toHaveProperty('timestamp');

      // Verify deleteUploadedImages was called
      expect(mockDeleteUploadedImages).toHaveBeenCalled();

      // Wait a bit for the admin success response
      await new Promise(resolve => setTimeout(resolve, 500));

    } finally {
      // Clean up
      client1.disconnect();
      client2.disconnect();
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  });

  it('should log file deletion errors but not fail the reset operation', async () => {
    // Spy on console.error to verify errors are logged
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock deleteUploadedImages to simulate partial failure
    const mockDeleteUploadedImages = vi.spyOn(fileUtils, 'deleteUploadedImages');
    mockDeleteUploadedImages.mockResolvedValue({
      deletedCount: 1,
      errors: [
        { url: '/uploads/failed.jpg', error: 'EACCES: permission denied' }
      ]
    });

    // Create test client
    const client = await createClient();

    try {
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 300));

      // Set up listener for reset event
      const resetPromise = waitForEvent(client, 'tournament:reset', 5000);

      // Trigger reset
      client.emit('admin:reset', {});

      // Wait for reset event
      const resetData = await resetPromise;

      // Verify client received the reset notification
      expect(resetData).toHaveProperty('timestamp');

      // Wait for error logging to occur
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify errors were logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'File deletion errors:',
        expect.arrayContaining([
          expect.objectContaining({
            url: '/uploads/failed.jpg',
            error: 'EACCES: permission denied'
          })
        ])
      );

    } finally {
      // Clean up
      client.disconnect();
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  });

  it('should send admin success response with error details when file deletion fails', async () => {
    // Mock deleteUploadedImages to simulate failure
    const mockDeleteUploadedImages = vi.spyOn(fileUtils, 'deleteUploadedImages');
    const mockErrors = [
      { url: '/uploads/test1.jpg', error: 'Permission denied' },
      { url: '/uploads/test2.jpg', error: 'File not found' }
    ];
    mockDeleteUploadedImages.mockResolvedValue({
      deletedCount: 0,
      errors: mockErrors
    });

    // Create admin client
    const adminClient = await createClient();

    try {
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 300));

      // Set up listener for admin success response
      const successPromise = waitForEvent(adminClient, 'admin:reset:success', 5000);

      // Trigger reset
      adminClient.emit('admin:reset', {});

      // Wait for success response
      const successData = await successPromise;

      // Verify success response includes error details
      expect(successData).toHaveProperty('message', 'Tournament reset successfully');
      expect(successData).toHaveProperty('deletedFiles', 0);
      expect(successData).toHaveProperty('errors');
      expect(successData.errors).toEqual(mockErrors);

    } finally {
      // Clean up
      adminClient.disconnect();
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  });

  it('should handle complete file deletion failure gracefully', async () => {
    // Mock deleteUploadedImages to throw an error
    const mockDeleteUploadedImages = vi.spyOn(fileUtils, 'deleteUploadedImages');
    mockDeleteUploadedImages.mockRejectedValue(new Error('File system error'));

    // Create test clients
    const adminClient = await createClient();
    const userClient = await createClient();

    try {
      // Wait for connections
      await new Promise(resolve => setTimeout(resolve, 300));

      // Set up listener for error response
      const errorPromise = waitForEvent(adminClient, 'error', 5000);

      // Trigger reset
      adminClient.emit('admin:reset', {});

      // Wait for error response
      const errorData = await errorPromise;

      // Verify error response
      expect(errorData).toHaveProperty('message');
      expect(errorData).toHaveProperty('code', 'RESET_ERROR');

      // Note: In this case, clients should NOT receive reset notification
      // because the reset operation failed before broadcasting

    } finally {
      // Clean up
      adminClient.disconnect();
      userClient.disconnect();
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  });
});
