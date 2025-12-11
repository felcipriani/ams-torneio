import { IncomingMessage, ServerResponse } from 'http';
import { SessionTokenGenerator } from './session-token';

/**
 * Session Cookie Middleware
 * 
 * Extracts IPv4 from HTTP request headers, generates session token,
 * and sets a cookie with secure attributes.
 */
export class SessionMiddleware {
  private sessionTokenGenerator: SessionTokenGenerator;
  private cookieName: string = 'meme_session';

  constructor(sessionTokenGenerator?: SessionTokenGenerator) {
    this.sessionTokenGenerator = sessionTokenGenerator || new SessionTokenGenerator();
  }

  /**
   * Extract IPv4 address from HTTP request headers
   * Handles X-Forwarded-For and X-Real-IP headers for proxies
   * Falls back to socket remote address if headers not present
   * 
   * @param req - HTTP request
   * @returns IPv4 address or fallback identifier
   */
  private extractIPv4FromRequest(req: IncomingMessage): string {
    // Check X-Forwarded-For header (proxy/load balancer)
    const xForwardedFor = req.headers['x-forwarded-for'];
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
    const xRealIp = req.headers['x-real-ip'];
    if (xRealIp && typeof xRealIp === 'string' && this.isValidIPv4(xRealIp)) {
      return xRealIp;
    }
    
    // Try socket remote address
    const remoteAddress = req.socket.remoteAddress;
    if (remoteAddress) {
      // Remove IPv6 prefix if present (::ffff:192.168.1.1 -> 192.168.1.1)
      const cleanAddress = remoteAddress.replace(/^::ffff:/, '');
      if (this.isValidIPv4(cleanAddress)) {
        return cleanAddress;
      }
    }
    
    // Fallback to a default identifier if IPv4 cannot be determined
    // Security logging: IPv4 extraction failure (no raw IP logged)
    console.warn('[SECURITY] IPv4 extraction failed from HTTP request, using fallback identifier');
    return 'unknown';
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
   * Check if session cookie already exists in request
   * 
   * @param req - HTTP request
   * @returns true if session cookie exists
   */
  private hasSessionCookie(req: IncomingMessage): boolean {
    const cookies = req.headers.cookie;
    if (!cookies) {
      return false;
    }
    
    // Parse cookies and check for session cookie
    const cookieArray = cookies.split(';').map(c => c.trim());
    return cookieArray.some(cookie => cookie.startsWith(`${this.cookieName}=`));
  }

  /**
   * Set session cookie with secure attributes
   * 
   * @param res - HTTP response
   * @param sessionToken - Session token to set in cookie
   */
  private setSessionCookie(res: ServerResponse, sessionToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Cookie attributes
    const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
    const secure = isProduction ? '; Secure' : '';
    const httpOnly = ''; // httpOnly: false (needs to be readable by client for WebSocket)
    const sameSite = '; SameSite=Strict';
    const path = '; Path=/';
    
    // Build cookie string
    const cookieValue = `${this.cookieName}=${sessionToken}; Max-Age=${maxAge}${secure}${httpOnly}${sameSite}${path}`;
    
    // Set cookie header
    res.setHeader('Set-Cookie', cookieValue);
  }

  /**
   * Middleware function to set session cookie on HTTP requests
   * Only sets cookie if it doesn't already exist
   * 
   * @param req - HTTP request
   * @param res - HTTP response
   */
  handle(req: IncomingMessage, res: ServerResponse): void {
    // Skip if session cookie already exists
    if (this.hasSessionCookie(req)) {
      return;
    }
    
    // Extract IPv4 and generate session token
    const ipv4 = this.extractIPv4FromRequest(req);
    const sessionToken = this.sessionTokenGenerator.generateToken(ipv4);
    
    // Set session cookie
    this.setSessionCookie(res, sessionToken);
  }
}

// Export singleton instance
export const sessionMiddleware = new SessionMiddleware();
