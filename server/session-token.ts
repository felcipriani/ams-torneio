import crypto from 'crypto';
import { Socket } from 'socket.io';

/**
 * Session Token Generator
 * 
 * Generates deterministic session tokens from IPv4 addresses using HMAC-SHA256.
 * Provides IPv4 extraction from Socket.IO sockets with proxy header support.
 */
export class SessionTokenGenerator {
  private salt: string;

  constructor(salt?: string) {
    // Use provided salt or get from environment variable
    this.salt = salt || process.env.SESSION_TOKEN_SALT || '';
    
    if (!this.salt) {
      console.warn('SESSION_TOKEN_SALT not set. Using empty salt (not recommended for production)');
    }
  }

  /**
   * Generate a deterministic session token from an IPv4 address
   * Uses HMAC-SHA256 with server-side salt for security
   * 
   * @param ipv4 - The user's IPv4 address
   * @returns Deterministic session token (hex string)
   */
  generateToken(ipv4: string): string {
    const hmac = crypto.createHmac('sha256', this.salt);
    hmac.update(ipv4);
    return hmac.digest('hex');
  }

  /**
   * Extract IPv4 address from Socket.IO socket
   * Handles X-Forwarded-For and X-Real-IP headers for proxies
   * Falls back to socket.id if IPv4 cannot be determined
   * 
   * @param socket - Socket.IO socket instance
   * @returns IPv4 address or fallback identifier
   */
  extractIPv4(socket: Socket): string {
    // Try to get IP from socket handshake
    const handshake = socket.handshake;
    
    // Check X-Forwarded-For header (proxy/load balancer)
    const xForwardedFor = handshake.headers['x-forwarded-for'];
    if (xForwardedFor) {
      // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
      // Take the first one (original client IP)
      const ips = typeof xForwardedFor === 'string' 
        ? xForwardedFor.split(',').map(ip => ip.trim())
        : [xForwardedFor[0]];
      
      const clientIp = ips[0];
      if (this.isValidIPv4(clientIp)) {
        return clientIp;
      }
    }
    
    // Check X-Real-IP header (alternative proxy header)
    const xRealIp = handshake.headers['x-real-ip'];
    if (xRealIp && typeof xRealIp === 'string' && this.isValidIPv4(xRealIp)) {
      return xRealIp;
    }
    
    // Try direct socket address
    const address = handshake.address;
    if (address) {
      // Remove IPv6 prefix if present (::ffff:192.168.1.1 -> 192.168.1.1)
      const cleanAddress = address.replace(/^::ffff:/, '');
      if (this.isValidIPv4(cleanAddress)) {
        return cleanAddress;
      }
    }
    
    // Fallback to socket.id if IPv4 cannot be determined
    // Security logging: IPv4 extraction failure (no raw IP logged)
    console.warn(`[SECURITY] IPv4 extraction failed for socket ${socket.id}, using socket.id as fallback`);
    return socket.id;
  }

  /**
   * Validate if a string is a valid IPv4 address
   * 
   * @param ip - String to validate
   * @returns true if valid IPv4 address
   */
  private isValidIPv4(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Regex.test(ip)) {
      return false;
    }
    
    // Check each octet is 0-255
    const octets = ip.split('.');
    return octets.every(octet => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }

  /**
   * Generate session token from socket
   * Convenience method that combines extractIPv4 and generateToken
   * 
   * @param socket - Socket.IO socket instance
   * @returns Session token
   */
  generateTokenFromSocket(socket: Socket): string {
    const ipv4 = this.extractIPv4(socket);
    return this.generateToken(ipv4);
  }
}

// Export singleton instance
export const sessionTokenGenerator = new SessionTokenGenerator();
