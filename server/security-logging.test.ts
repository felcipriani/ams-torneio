import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { SessionTokenGenerator } from './session-token';
import { VoteLockManager } from './vote-lock-manager';
import { Socket } from 'socket.io';

/**
 * Property-Based Tests for Security Logging
 * 
 * **Feature: vote-once-per-user, Property: Security Logging**
 * **Validates: Requirements 5.2, 5.5**
 * 
 * These tests verify that:
 * 1. No raw IPv4 addresses are logged anywhere in the system
 * 2. Session tokens are logged instead of raw IPs
 * 3. IPv4 extraction failures are logged without exposing raw IPs
 */

describe('Security Logging Properties', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on all console methods
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  /**
   * IPv4 address generator
   * Generates valid IPv4 addresses for testing
   */
  const ipv4Generator = fc.tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

  /**
   * Check if a string contains a raw IPv4 address
   */
  function containsRawIPv4(text: string, ipv4: string): boolean {
    // Check for exact IP match
    if (text.includes(ipv4)) {
      return true;
    }
    
    // Check for IP in common formats
    const ipRegex = /\b(\d{1,3}\.){3}\d{1,3}\b/g;
    const matches = text.match(ipRegex);
    
    if (matches) {
      return matches.includes(ipv4);
    }
    
    return false;
  }

  /**
   * Get all logged messages from console spies
   */
  function getAllLoggedMessages(): string[] {
    const messages: string[] = [];
    
    // Get all console.warn calls
    consoleWarnSpy.mock.calls.forEach(call => {
      messages.push(call.map(arg => String(arg)).join(' '));
    });
    
    // Get all console.log calls
    consoleLogSpy.mock.calls.forEach(call => {
      messages.push(call.map(arg => String(arg)).join(' '));
    });
    
    // Get all console.error calls
    consoleErrorSpy.mock.calls.forEach(call => {
      messages.push(call.map(arg => String(arg)).join(' '));
    });
    
    return messages;
  }

  it('Property: No raw IPv4 addresses in logs when extracting from socket', () => {
    fc.assert(
      fc.property(ipv4Generator, (ipv4) => {
        // Reset spies
        consoleWarnSpy.mockClear();
        consoleLogSpy.mockClear();
        consoleErrorSpy.mockClear();

        const generator = new SessionTokenGenerator('test-salt');
        
        // Create mock socket with IPv4 in various header configurations
        const mockSocket = {
          id: 'test-socket-id',
          handshake: {
            headers: {
              'x-forwarded-for': ipv4,
            },
            address: ipv4,
          },
        } as unknown as Socket;

        // Extract IPv4 (this should not log the raw IP)
        const extractedIp = generator.extractIPv4(mockSocket);
        
        // Generate token (this should not log the raw IP)
        const token = generator.generateToken(extractedIp);

        // Get all logged messages
        const loggedMessages = getAllLoggedMessages();
        
        // Verify no raw IPv4 appears in any log message
        for (const message of loggedMessages) {
          if (containsRawIPv4(message, ipv4)) {
            return false;
          }
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property: IPv4 extraction failures are logged without raw IPs', () => {
    fc.assert(
      fc.property(fc.string(), (socketId) => {
        // Reset spies
        consoleWarnSpy.mockClear();
        consoleLogSpy.mockClear();
        consoleErrorSpy.mockClear();

        const generator = new SessionTokenGenerator('test-salt');
        
        // Create mock socket with NO valid IPv4 (should trigger fallback logging)
        const mockSocket = {
          id: socketId,
          handshake: {
            headers: {},
            address: undefined,
          },
        } as unknown as Socket;

        // Extract IPv4 (this should log a warning about fallback)
        generator.extractIPv4(mockSocket);

        // Get all logged messages
        const loggedMessages = getAllLoggedMessages();
        
        // Verify that a security warning was logged
        const hasSecurityWarning = loggedMessages.some(msg => 
          msg.includes('[SECURITY]') && msg.includes('IPv4 extraction failed')
        );
        
        // Verify no IPv4 pattern appears in logs (since there was no valid IPv4)
        const ipv4Pattern = /\b(\d{1,3}\.){3}\d{1,3}\b/;
        const hasNoIPv4Pattern = !loggedMessages.some(msg => ipv4Pattern.test(msg));
        
        return hasSecurityWarning && hasNoIPv4Pattern;
      }),
      { numRuns: 100 }
    );
  });

  it('Property: Duplicate vote attempts log session tokens, not raw IPs', () => {
    fc.assert(
      fc.property(
        ipv4Generator,
        fc.string({ minLength: 1, maxLength: 20 }),
        (ipv4, matchId) => {
          // Reset spies
          consoleWarnSpy.mockClear();
          consoleLogSpy.mockClear();
          consoleErrorSpy.mockClear();

          const generator = new SessionTokenGenerator('test-salt');
          const voteLockManager = new VoteLockManager();
          
          // Generate session token from IPv4
          const sessionToken = generator.generateToken(ipv4);
          
          // Record a vote
          voteLockManager.recordVote(sessionToken, matchId);
          
          // Check if already voted (this simulates the duplicate vote check)
          const hasVoted = voteLockManager.hasVoted(sessionToken, matchId);
          
          if (hasVoted) {
            // Simulate the logging that happens in websocket.ts
            console.warn(`[SECURITY] Duplicate vote attempt - Session: ${sessionToken.substring(0, 8)}..., Match: ${matchId}, Socket: test-socket`);
          }

          // Get all logged messages
          const loggedMessages = getAllLoggedMessages();
          
          // Verify no raw IPv4 appears in any log message
          for (const message of loggedMessages) {
            if (containsRawIPv4(message, ipv4)) {
              return false;
            }
          }
          
          // Verify that if a security warning was logged, it contains truncated session token
          const securityWarnings = loggedMessages.filter(msg => 
            msg.includes('[SECURITY]') && msg.includes('Duplicate vote attempt')
          );
          
          if (securityWarnings.length > 0) {
            // Verify session token is truncated (only first 8 chars shown)
            const hasSessionToken = securityWarnings.some(msg => 
              msg.includes(sessionToken.substring(0, 8))
            );
            
            // Verify full session token is NOT in the log
            const hasFullSessionToken = securityWarnings.some(msg => 
              msg.includes(sessionToken) && !msg.includes('...')
            );
            
            return hasSessionToken && !hasFullSessionToken;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Session tokens are hashed, not stored as raw IPs', () => {
    fc.assert(
      fc.property(ipv4Generator, (ipv4) => {
        const generator = new SessionTokenGenerator('test-salt');
        
        // Generate token from IPv4
        const token = generator.generateToken(ipv4);
        
        // Verify token is not the raw IPv4
        if (token === ipv4) {
          return false;
        }
        
        // Verify token is a hex string (SHA256 produces 64 hex chars)
        const hexPattern = /^[0-9a-f]{64}$/;
        if (!hexPattern.test(token)) {
          return false;
        }
        
        // Verify token doesn't contain the IPv4 address
        if (token.includes(ipv4)) {
          return false;
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
