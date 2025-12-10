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
});
