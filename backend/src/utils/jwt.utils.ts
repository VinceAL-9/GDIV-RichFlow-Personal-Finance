import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'your-access-secret-change-in-production';
const REFRESH_TOKEN_EXPIRY_DAYS = 30; // Refresh tokens last 30 days

interface TokenPayload {
  userId: number;
  email: string;
}

/**
 * Generate short-lived access token (JWT, 15 minutes)
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: '15m' // 15 minutes
  });
}

/**
 * Generate long-lived refresh token (cryptographically secure random string)
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Calculate refresh token expiration (30 days from now)
 */
export function getRefreshTokenExpiration(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

// Legacy function for backward compatibility
export function generateToken(userId: number): string {
  return generateAccessToken({ userId, email: '' });
}

// Legacy function for backward compatibility
export function verifyToken(token: string): { userId: number } | null {
  return verifyAccessToken(token);
}

// Legacy function for backward compatibility
export function generateSessionExpiry(): Date {
  return getRefreshTokenExpiration();
}