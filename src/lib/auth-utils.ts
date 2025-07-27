/**
 * Backend JWT and Cookie Utilities
 * Provides unified JWT generation and cookie management
 */

import * as jwt from "jsonwebtoken";
import { Response } from "express";
import { User, JWTPayload, CookieOptions, SessionData } from "../types/auth";

/**
 * Generate JWT access token for a user
 */
export function generateAccessToken(user: User, expiresIn: string = '15m'): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    userRole: user.userRole,
  };

  return jwt.sign(payload, jwtSecret, { 
    expiresIn,
    issuer: 'odrindia',
    audience: 'odrindia-users'
  } as jwt.SignOptions);
}

/**
 * Generate JWT refresh token for a user
 */
export function generateRefreshToken(user: User, expiresIn: string = '7d'): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    userRole: user.userRole,
  };

  return jwt.sign(payload, jwtSecret, { 
    expiresIn,
    issuer: 'odrindia',
    audience: 'odrindia-refresh'
  } as jwt.SignOptions);
}

/**
 * Get cookie options based on environment
 */
export function getCookieOptions(isRefresh = false): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? "none" : "lax", // Cross-origin in production
    path: "/",
    maxAge: isRefresh ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000 // 7d for refresh, 15m for access
  };
}

/**
 * Set authentication cookies on response
 */
export function setAuthCookies(res: Response, user: User): void {
  try {
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set access token cookie
    res.cookie('access_token', accessToken, getCookieOptions(false));
    
    // Set refresh token cookie
    res.cookie('refresh_token', refreshToken, getCookieOptions(true));

    // Legacy session cookie for backward compatibility
    const sessionData: SessionData = {
      user,
      exp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
      iat: new Date().toISOString(),
    };
    const sessionCookie = Buffer.from(JSON.stringify(sessionData), 'utf-8').toString('base64');
    res.cookie('odrindia_session', sessionCookie, {
      ...getCookieOptions(false),
      maxAge: 24 * 60 * 60 * 1000 // 24h for legacy compatibility
    });

    console.log(`Authentication cookies set for user: ${user.email}`);
  } catch (error) {
    console.error('Error setting auth cookies:', error);
    throw error;
  }
}

/**
 * Clear authentication cookies
 */
export function clearAuthCookies(res: Response): void {
  try {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? "none" as const : "lax" as const,
      path: "/",
    };

    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
    res.clearCookie('odrindia_session', cookieOptions);

    console.log('Authentication cookies cleared');
  } catch (error) {
    console.error('Error clearing auth cookies:', error);
  }
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not configured');
      return null;
    }

    return jwt.verify(token, jwtSecret) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('JWT token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('Invalid JWT token');
    } else {
      console.error('JWT verification error:', error);
    }
    return null;
  }
}
