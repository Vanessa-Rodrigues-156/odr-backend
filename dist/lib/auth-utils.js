"use strict";
/**
 * Backend JWT and Cookie Utilities
 * Provides unified JWT generation and cookie management
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.getCookieOptions = getCookieOptions;
exports.setAuthCookies = setAuthCookies;
exports.clearAuthCookies = clearAuthCookies;
exports.verifyToken = verifyToken;
const jwt = __importStar(require("jsonwebtoken"));
/**
 * Generate JWT access token for a user
 */
function generateAccessToken(user, expiresIn = '15m') {
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
    });
}
/**
 * Generate JWT refresh token for a user
 */
function generateRefreshToken(user, expiresIn = '7d') {
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
    });
}
/**
 * Get cookie options based on environment
 */
function getCookieOptions(isRefresh = false) {
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
function setAuthCookies(res, user) {
    try {
        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        // Set access token cookie
        res.cookie('access_token', accessToken, getCookieOptions(false));
        // Set refresh token cookie
        res.cookie('refresh_token', refreshToken, getCookieOptions(true));
        // Legacy session cookie for backward compatibility
        const sessionData = {
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
    }
    catch (error) {
        console.error('Error setting auth cookies:', error);
        throw error;
    }
}
/**
 * Clear authentication cookies
 */
function clearAuthCookies(res) {
    try {
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? "none" : "lax",
            path: "/",
        };
        res.clearCookie('access_token', cookieOptions);
        res.clearCookie('refresh_token', cookieOptions);
        res.clearCookie('odrindia_session', cookieOptions);
        console.log('Authentication cookies cleared');
    }
    catch (error) {
        console.error('Error clearing auth cookies:', error);
    }
}
/**
 * Verify JWT token
 */
function verifyToken(token) {
    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET is not configured');
            return null;
        }
        return jwt.verify(token, jwtSecret);
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            console.log('JWT token has expired');
        }
        else if (error instanceof jwt.JsonWebTokenError) {
            console.log('Invalid JWT token');
        }
        else {
            console.error('JWT verification error:', error);
        }
        return null;
    }
}
