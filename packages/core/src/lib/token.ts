import { randomBytes } from 'crypto';

/**
 * Generates a secure random token for password reset or email verification
 * @param length The length of the token in bytes (default: 32)
 * @returns A hex string token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generates a reset token expiry date
 * @param hoursFromNow Number of hours until expiry (default: 1 hour)
 * @returns Date object representing expiry time
 */
export function generateTokenExpiry(hoursFromNow: number = 1): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hoursFromNow);
  return expiry;
}

/**
 * Checks if a token has expired
 * @param expiry The expiry date to check
 * @returns true if expired, false otherwise
 */
export function isTokenExpired(expiry: Date | null): boolean {
  if (!expiry) return true;
  return new Date() > expiry;
}
