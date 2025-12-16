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
    // If no salt is configured, use the IP directly as the token
    // This ensures different IPs generate different tokens even without a salt
    if (!this.salt) {
      // Hash the IP with SHA256 (without HMAC) for basic obfuscation
      const hash = crypto.createHash('sha256');
      hash.update(ipv4);
      return hash.digest('hex');
    }
    
    // Use HMAC-SHA256 with salt for proper security
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
    
    // Debug: Log what we're receiving
    console.log('[DEBUG] Socket handshake address:', handshake.address);
    console.log('[DEBUG] X-Forwarded-For:', handshake.headers['x-forwarded-for']);
    console.log('[DEBUG] X-Real-IP:', handshake.headers['x-real-ip']);
    
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
        console.log('[DEBUG] Using X-Forwarded-For:', clientIp);
        return clientIp;
      }
    }
    
    // Check X-Real-IP header (alternative proxy header)
    const xRealIp = handshake.headers['x-real-ip'];
    if (xRealIp && typeof xRealIp === 'string' && this.isValidIPv4(xRealIp)) {
      console.log('[DEBUG] Using X-Real-IP:', xRealIp);
      return xRealIp;
    }
    
    // Try direct socket address
    const address = handshake.address;
    if (address) {
      console.log('[DEBUG] Raw address:', address);
      
      // Remove IPv6 prefix if present (::ffff:192.168.1.1 -> 192.168.1.1)
      const cleanAddress = address.replace(/^::ffff:/, '');
      console.log('[DEBUG] Clean address:', cleanAddress);
      
      if (this.isValidIPv4(cleanAddress)) {
        console.log('[DEBUG] Using clean address:', cleanAddress);
        return cleanAddress;
      }
      
      // Handle IPv6 localhost (::1) - convert to IPv4 localhost
      if (cleanAddress === '::1' || address === '::1') {
        console.log('[DEBUG] Converting IPv6 localhost to IPv4');
        return '127.0.0.1';
      }
    }
    
    // Try socket.request.connection.remoteAddress (alternative source)
    const request = socket.request as any;
    if (request?.connection?.remoteAddress) {
      const remoteAddr = request.connection.remoteAddress;
      console.log('[DEBUG] Remote address from connection:', remoteAddr);
      
      const cleanRemote = remoteAddr.replace(/^::ffff:/, '');
      
      if (this.isValidIPv4(cleanRemote)) {
        console.log('[DEBUG] Using remote address:', cleanRemote);
        return cleanRemote;
      }
      
      // Handle IPv6 localhost
      if (cleanRemote === '::1' || remoteAddr === '::1') {
        console.log('[DEBUG] Converting IPv6 localhost from connection to IPv4');
        return '127.0.0.1';
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
