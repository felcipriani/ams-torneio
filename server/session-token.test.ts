// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { SessionTokenGenerator } from './session-token';
import { Socket } from 'socket.io';

describe('SessionTokenGenerator', () => {
  let generator: SessionTokenGenerator;

  beforeEach(() => {
    generator = new SessionTokenGenerator('test-salt-for-determinism');
  });

  /**
   * Feature: vote-once-per-user, Property 1: Session Token Determinism
   * Validates: Requirements 2.2, 2.3
   * 
   * For any IPv4 address, generating a session token multiple times 
   * should always produce the same token value.
   */
  describe('Property 1: Session Token Determinism', () => {
    it('should generate identical tokens for the same IPv4 address', () => {
      fc.assert(
        fc.property(
          // Generate random valid IPv4 addresses
          fc.tuple(
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 })
          ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          (ipv4) => {
            // Generate token multiple times
            const token1 = generator.generateToken(ipv4);
            const token2 = generator.generateToken(ipv4);
            const token3 = generator.generateToken(ipv4);

            // All tokens should be identical
            expect(token1).toBe(token2);
            expect(token2).toBe(token3);
            expect(token1).toBe(token3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate different tokens for different IPv4 addresses', () => {
      fc.assert(
        fc.property(
          // Generate two different IPv4 addresses
          fc.tuple(
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 })
          ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          fc.tuple(
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 })
          ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          (ipv4_1, ipv4_2) => {
            // Skip if IPs are the same
            fc.pre(ipv4_1 !== ipv4_2);

            const token1 = generator.generateToken(ipv4_1);
            const token2 = generator.generateToken(ipv4_2);

            // Tokens should be different for different IPs
            expect(token1).not.toBe(token2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: vote-once-per-user, Property 6: IPv4 Extraction Consistency
   * Validates: Requirements 6.2
   * 
   * For any socket with the same underlying IPv4 address (even with different 
   * proxy headers), the extracted IPv4 should be consistent.
   */
  describe('Property 6: IPv4 Extraction Consistency', () => {
    it('should extract the same IPv4 from X-Forwarded-For header consistently', () => {
      fc.assert(
        fc.property(
          // Generate random valid IPv4 addresses
          fc.tuple(
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 })
          ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          (ipv4) => {
            // Create mock sockets with X-Forwarded-For header
            const mockSocket1 = {
              id: 'socket-1',
              handshake: {
                headers: {
                  'x-forwarded-for': ipv4
                },
                address: '127.0.0.1'
              }
            } as unknown as Socket;

            const mockSocket2 = {
              id: 'socket-2',
              handshake: {
                headers: {
                  'x-forwarded-for': `${ipv4}, 10.0.0.1, 10.0.0.2`
                },
                address: '127.0.0.1'
              }
            } as unknown as Socket;

            // Extract IPv4 from both sockets
            const extracted1 = generator.extractIPv4(mockSocket1);
            const extracted2 = generator.extractIPv4(mockSocket2);

            // Both should extract the same client IP
            expect(extracted1).toBe(ipv4);
            expect(extracted2).toBe(ipv4);
            expect(extracted1).toBe(extracted2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract the same IPv4 from X-Real-IP header consistently', () => {
      fc.assert(
        fc.property(
          // Generate random valid IPv4 addresses
          fc.tuple(
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 })
          ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          (ipv4) => {
            // Create mock socket with X-Real-IP header
            const mockSocket = {
              id: 'socket-1',
              handshake: {
                headers: {
                  'x-real-ip': ipv4
                },
                address: '127.0.0.1'
              }
            } as unknown as Socket;

            // Extract IPv4
            const extracted = generator.extractIPv4(mockSocket);

            // Should extract the correct IP
            expect(extracted).toBe(ipv4);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract the same IPv4 from direct address consistently', () => {
      fc.assert(
        fc.property(
          // Generate random valid IPv4 addresses
          fc.tuple(
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 })
          ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          (ipv4) => {
            // Create mock socket with direct address
            const mockSocket1 = {
              id: 'socket-1',
              handshake: {
                headers: {},
                address: ipv4
              }
            } as unknown as Socket;

            // Create another mock socket with IPv6-mapped IPv4
            const mockSocket2 = {
              id: 'socket-2',
              handshake: {
                headers: {},
                address: `::ffff:${ipv4}`
              }
            } as unknown as Socket;

            // Extract IPv4 from both
            const extracted1 = generator.extractIPv4(mockSocket1);
            const extracted2 = generator.extractIPv4(mockSocket2);

            // Both should extract the same IP
            expect(extracted1).toBe(ipv4);
            expect(extracted2).toBe(ipv4);
            expect(extracted1).toBe(extracted2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prioritize X-Forwarded-For over other headers', () => {
      fc.assert(
        fc.property(
          // Generate two different IPv4 addresses
          fc.tuple(
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 })
          ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          fc.tuple(
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 })
          ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          (ipv4_forwarded, ipv4_real) => {
            // Skip if IPs are the same
            fc.pre(ipv4_forwarded !== ipv4_real);

            // Create mock socket with both headers
            const mockSocket = {
              id: 'socket-1',
              handshake: {
                headers: {
                  'x-forwarded-for': ipv4_forwarded,
                  'x-real-ip': ipv4_real
                },
                address: '127.0.0.1'
              }
            } as unknown as Socket;

            // Extract IPv4
            const extracted = generator.extractIPv4(mockSocket);

            // Should prioritize X-Forwarded-For
            expect(extracted).toBe(ipv4_forwarded);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: vote-once-per-user, Property 8: Multi-Browser Same-IP Detection
   * Validates: Requirements 1.5, 2.3
   * 
   * For any two connections from different browsers but the same IPv4 address,
   * both should generate identical session tokens.
   */
  describe('Property 8: Multi-Browser Same-IP Detection', () => {
    it('should generate identical tokens for different browsers on same IPv4', () => {
      fc.assert(
        fc.property(
          // Generate random valid IPv4 address
          fc.tuple(
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 })
          ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          // Generate random socket IDs to simulate different browsers
          fc.string({ minLength: 10, maxLength: 20 }),
          fc.string({ minLength: 10, maxLength: 20 }),
          (ipv4, socketId1, socketId2) => {
            // Ensure different socket IDs (different browsers)
            fc.pre(socketId1 !== socketId2);

            // Create mock sockets representing different browsers
            // Browser 1 (e.g., Chrome)
            const mockSocketBrowser1 = {
              id: socketId1,
              handshake: {
                headers: {
                  'x-forwarded-for': ipv4
                },
                address: '127.0.0.1'
              }
            } as unknown as Socket;

            // Browser 2 (e.g., Firefox)
            const mockSocketBrowser2 = {
              id: socketId2,
              handshake: {
                headers: {
                  'x-forwarded-for': ipv4
                },
                address: '127.0.0.1'
              }
            } as unknown as Socket;

            // Generate tokens from both sockets
            const token1 = generator.generateTokenFromSocket(mockSocketBrowser1);
            const token2 = generator.generateTokenFromSocket(mockSocketBrowser2);

            // Both browsers should get the same session token
            // because they share the same IPv4 address
            expect(token1).toBe(token2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate identical tokens for same IP via different proxy headers', () => {
      fc.assert(
        fc.property(
          // Generate random valid IPv4 address
          fc.tuple(
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 })
          ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          // Generate random socket IDs
          fc.string({ minLength: 10, maxLength: 20 }),
          fc.string({ minLength: 10, maxLength: 20 }),
          (ipv4, socketId1, socketId2) => {
            // Ensure different socket IDs
            fc.pre(socketId1 !== socketId2);

            // Browser 1 with X-Forwarded-For
            const mockSocketBrowser1 = {
              id: socketId1,
              handshake: {
                headers: {
                  'x-forwarded-for': ipv4
                },
                address: '127.0.0.1'
              }
            } as unknown as Socket;

            // Browser 2 with X-Real-IP
            const mockSocketBrowser2 = {
              id: socketId2,
              handshake: {
                headers: {
                  'x-real-ip': ipv4
                },
                address: '127.0.0.1'
              }
            } as unknown as Socket;

            // Browser 3 with direct address
            const mockSocketBrowser3 = {
              id: `${socketId1}-3`,
              handshake: {
                headers: {},
                address: ipv4
              }
            } as unknown as Socket;

            // Generate tokens from all sockets
            const token1 = generator.generateTokenFromSocket(mockSocketBrowser1);
            const token2 = generator.generateTokenFromSocket(mockSocketBrowser2);
            const token3 = generator.generateTokenFromSocket(mockSocketBrowser3);

            // All browsers should get the same session token
            // regardless of how the IP was extracted
            expect(token1).toBe(token2);
            expect(token2).toBe(token3);
            expect(token1).toBe(token3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate identical tokens for same IP with IPv6-mapped addresses', () => {
      fc.assert(
        fc.property(
          // Generate random valid IPv4 address
          fc.tuple(
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 })
          ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          // Generate random socket IDs
          fc.string({ minLength: 10, maxLength: 20 }),
          fc.string({ minLength: 10, maxLength: 20 }),
          (ipv4, socketId1, socketId2) => {
            // Ensure different socket IDs
            fc.pre(socketId1 !== socketId2);

            // Browser 1 with plain IPv4
            const mockSocketBrowser1 = {
              id: socketId1,
              handshake: {
                headers: {},
                address: ipv4
              }
            } as unknown as Socket;

            // Browser 2 with IPv6-mapped IPv4
            const mockSocketBrowser2 = {
              id: socketId2,
              handshake: {
                headers: {},
                address: `::ffff:${ipv4}`
              }
            } as unknown as Socket;

            // Generate tokens from both sockets
            const token1 = generator.generateTokenFromSocket(mockSocketBrowser1);
            const token2 = generator.generateTokenFromSocket(mockSocketBrowser2);

            // Both should get the same session token
            expect(token1).toBe(token2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
