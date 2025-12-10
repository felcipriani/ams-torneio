/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { SessionMiddleware } from './session-middleware';
import { SessionTokenGenerator } from './session-token';
import { IncomingMessage, ServerResponse } from 'http';
import { Socket } from 'net';

/**
 * **Feature: vote-once-per-user, Property 7: Cookie Persistence**
 * 
 * For any user session, if a session token cookie is set, subsequent requests 
 * from the same browser should include the same session token value.
 * 
 * **Validates: Requirements 2.4**
 */

describe('SessionMiddleware - Property-Based Tests', () => {
  let sessionMiddleware: SessionMiddleware;
  let sessionTokenGenerator: SessionTokenGenerator;

  beforeEach(() => {
    sessionTokenGenerator = new SessionTokenGenerator('test-salt-for-cookie-persistence');
    sessionMiddleware = new SessionMiddleware(sessionTokenGenerator);
  });

  // ============================================================================
  // Arbitraries (Generators) for fast-check
  // ============================================================================

  /**
   * Generate a random valid IPv4 address
   */
  const ipv4Arbitrary = fc.tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

  /**
   * Create a mock HTTP request with the given IPv4 address
   */
  const createMockRequest = (ipv4: string, existingCookie?: string): IncomingMessage => {
    // Create a mock socket with remoteAddress property
    const socket = {
      remoteAddress: ipv4
    } as Socket;

    const req = new IncomingMessage(socket);
    req.headers = {};
    
    if (existingCookie) {
      req.headers.cookie = existingCookie;
    }

    return req;
  };

  /**
   * Create a mock HTTP response
   */
  const createMockResponse = (): ServerResponse & { _setCookieValue?: string } => {
    const mockSocket = {} as Socket;
    const mockReq = new IncomingMessage(mockSocket);
    const res = new ServerResponse(mockReq) as ServerResponse & { _setCookieValue?: string };
    
    // Override setHeader to capture Set-Cookie header
    const originalSetHeader = res.setHeader.bind(res);
    res.setHeader = function(name: string, value: string | string[]) {
      if (name === 'Set-Cookie') {
        res._setCookieValue = Array.isArray(value) ? value[0] : value;
      }
      return originalSetHeader(name, value);
    };

    return res;
  };

  /**
   * Extract session token from Set-Cookie header
   */
  const extractSessionTokenFromCookie = (cookieHeader: string): string | null => {
    const match = cookieHeader.match(/meme_session=([^;]+)/);
    return match ? match[1] : null;
  };

  // ============================================================================
  // Property Tests
  // ============================================================================

  /**
   * Property 7: Cookie Persistence
   * 
   * For any user session, if a session token cookie is set, subsequent requests 
   * from the same browser should include the same session token value.
   */
  it('should set the same session token cookie for the same IPv4 address', async () => {
    await fc.assert(
      fc.asyncProperty(
        ipv4Arbitrary,
        async (ipv4) => {
          // First request - no existing cookie
          const req1 = createMockRequest(ipv4);
          const res1 = createMockResponse();

          sessionMiddleware.handle(req1, res1);

          // Extract the session token from the first response
          const setCookieHeader1 = res1._setCookieValue;
          expect(setCookieHeader1).toBeDefined();
          
          const sessionToken1 = extractSessionTokenFromCookie(setCookieHeader1!);
          expect(sessionToken1).toBeTruthy();

          // Second request - simulate browser sending the cookie back
          const req2 = createMockRequest(ipv4, `meme_session=${sessionToken1}`);
          const res2 = createMockResponse();

          sessionMiddleware.handle(req2, res2);

          // Second response should NOT set a new cookie (cookie already exists)
          expect(res2._setCookieValue).toBeUndefined();

          // Third request - no cookie (simulating cookie cleared)
          const req3 = createMockRequest(ipv4);
          const res3 = createMockResponse();

          sessionMiddleware.handle(req3, res3);

          // Extract the session token from the third response
          const setCookieHeader3 = res3._setCookieValue;
          expect(setCookieHeader3).toBeDefined();
          
          const sessionToken3 = extractSessionTokenFromCookie(setCookieHeader3!);
          expect(sessionToken3).toBeTruthy();

          // Session tokens should be identical (same IPv4 = same token)
          expect(sessionToken1).toBe(sessionToken3);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate consistent session tokens across multiple requests from the same IPv4', async () => {
    await fc.assert(
      fc.asyncProperty(
        ipv4Arbitrary,
        fc.integer({ min: 2, max: 5 }),
        async (ipv4, requestCount) => {
          const sessionTokens: string[] = [];

          // Make multiple requests from the same IPv4 (without existing cookies)
          for (let i = 0; i < requestCount; i++) {
            const req = createMockRequest(ipv4);
            const res = createMockResponse();

            sessionMiddleware.handle(req, res);

            const setCookieHeader = res._setCookieValue;
            expect(setCookieHeader).toBeDefined();
            
            const sessionToken = extractSessionTokenFromCookie(setCookieHeader!);
            expect(sessionToken).toBeTruthy();
            sessionTokens.push(sessionToken!);
          }

          // All session tokens should be identical
          const firstToken = sessionTokens[0];
          for (const token of sessionTokens) {
            expect(token).toBe(firstToken);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not set cookie when cookie already exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        ipv4Arbitrary,
        async (ipv4) => {
          // First request - set the cookie
          const req1 = createMockRequest(ipv4);
          const res1 = createMockResponse();

          sessionMiddleware.handle(req1, res1);

          const setCookieHeader1 = res1._setCookieValue;
          expect(setCookieHeader1).toBeDefined();
          
          const sessionToken = extractSessionTokenFromCookie(setCookieHeader1!);
          expect(sessionToken).toBeTruthy();

          // Subsequent request with existing cookie
          const req2 = createMockRequest(ipv4, `meme_session=${sessionToken}`);
          const res2 = createMockResponse();

          sessionMiddleware.handle(req2, res2);

          // Should NOT set a new cookie
          expect(res2._setCookieValue).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate different session tokens for different IPv4 addresses', async () => {
    await fc.assert(
      fc.asyncProperty(
        ipv4Arbitrary,
        ipv4Arbitrary,
        async (ipv4_1, ipv4_2) => {
          // Skip if IPs are the same
          fc.pre(ipv4_1 !== ipv4_2);

          // Request from first IPv4
          const req1 = createMockRequest(ipv4_1);
          const res1 = createMockResponse();

          sessionMiddleware.handle(req1, res1);

          const setCookieHeader1 = res1._setCookieValue;
          expect(setCookieHeader1).toBeDefined();
          
          const sessionToken1 = extractSessionTokenFromCookie(setCookieHeader1!);
          expect(sessionToken1).toBeTruthy();

          // Request from second IPv4
          const req2 = createMockRequest(ipv4_2);
          const res2 = createMockResponse();

          sessionMiddleware.handle(req2, res2);

          const setCookieHeader2 = res2._setCookieValue;
          expect(setCookieHeader2).toBeDefined();
          
          const sessionToken2 = extractSessionTokenFromCookie(setCookieHeader2!);
          expect(sessionToken2).toBeTruthy();

          // Session tokens should be different
          expect(sessionToken1).not.toBe(sessionToken2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle X-Forwarded-For header correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        ipv4Arbitrary,
        async (ipv4) => {
          // Create request with X-Forwarded-For header
          const socket = {
            remoteAddress: '10.0.0.1' // Proxy IP
          } as Socket;

          const req = new IncomingMessage(socket);
          req.headers = {
            'x-forwarded-for': ipv4 // Real client IP
          };

          const res = createMockResponse();

          sessionMiddleware.handle(req, res);

          const setCookieHeader = res._setCookieValue;
          expect(setCookieHeader).toBeDefined();
          
          const sessionToken = extractSessionTokenFromCookie(setCookieHeader!);
          expect(sessionToken).toBeTruthy();

          // Should generate the same token as direct connection from that IP
          const expectedToken = sessionTokenGenerator.generateToken(ipv4);
          expect(sessionToken).toBe(expectedToken);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle X-Real-IP header correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        ipv4Arbitrary,
        async (ipv4) => {
          // Create request with X-Real-IP header
          const socket = {
            remoteAddress: '10.0.0.1' // Proxy IP
          } as Socket;

          const req = new IncomingMessage(socket);
          req.headers = {
            'x-real-ip': ipv4 // Real client IP
          };

          const res = createMockResponse();

          sessionMiddleware.handle(req, res);

          const setCookieHeader = res._setCookieValue;
          expect(setCookieHeader).toBeDefined();
          
          const sessionToken = extractSessionTokenFromCookie(setCookieHeader!);
          expect(sessionToken).toBeTruthy();

          // Should generate the same token as direct connection from that IP
          const expectedToken = sessionTokenGenerator.generateToken(ipv4);
          expect(sessionToken).toBe(expectedToken);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should respect cookie attributes for security', async () => {
    await fc.assert(
      fc.asyncProperty(
        ipv4Arbitrary,
        async (ipv4) => {
          const req = createMockRequest(ipv4);
          const res = createMockResponse();

          sessionMiddleware.handle(req, res);

          const setCookieHeader = res._setCookieValue;
          expect(setCookieHeader).toBeDefined();

          // Verify cookie attributes
          expect(setCookieHeader).toContain('Max-Age=');
          expect(setCookieHeader).toContain('SameSite=Strict');
          expect(setCookieHeader).toContain('Path=/');
          
          // Should NOT contain HttpOnly (needs to be readable by client)
          expect(setCookieHeader).not.toContain('HttpOnly');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle multiple cookies in request correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        ipv4Arbitrary,
        async (ipv4) => {
          // First request to get session token
          const req1 = createMockRequest(ipv4);
          const res1 = createMockResponse();

          sessionMiddleware.handle(req1, res1);

          const setCookieHeader1 = res1._setCookieValue;
          const sessionToken = extractSessionTokenFromCookie(setCookieHeader1!);

          // Second request with multiple cookies including session cookie
          const req2 = createMockRequest(
            ipv4, 
            `other_cookie=value; meme_session=${sessionToken}; another_cookie=value2`
          );
          const res2 = createMockResponse();

          sessionMiddleware.handle(req2, res2);

          // Should NOT set a new cookie (session cookie exists)
          expect(res2._setCookieValue).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
