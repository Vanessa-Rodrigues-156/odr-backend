import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import jwt, { JwtPayload } from "jsonwebtoken";

// Define the structure for token errors
interface TokenError {
  name: string;
  message: string;
  expiredAt?: Date;
}

/**
 * Debug endpoint that helps diagnose authentication issues
 * This should be DISABLED in production
 */
export default async function debugAuthHandler(req: AuthRequest, res: Response) {
  // Security check - only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: "Not found" });
  }

  // Get the auth header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") 
    ? authHeader.split(" ")[1] 
    : null;

  // Check request headers
  const headers = {
    authorization: req.headers.authorization ? "Present (masked)" : "Missing",
    contentType: req.headers["content-type"] || "Not set",
    accept: req.headers.accept || "Not set",
    userAgent: req.headers["user-agent"] || "Not set",
  };

  // Check JWT validity without using our auth middleware
  let tokenInfo: JwtPayload | null = null;
  let tokenError: TokenError | null = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
      // Ensure decoded is an object with our expected properties
      
      tokenInfo = typeof decoded === 'object' ? decoded as JwtPayload : null;
    } catch (err: any) {
      tokenError = {
        name: err.name,
        message: err.message,
        expiredAt: err.name === 'TokenExpiredError' ? err.expiredAt : undefined
      };
    }
  }

  // Response data
  const responseData = {
    authStatus: {
      authenticated: !!req.user,
      user: req.user ? {
        id: req.user.id,
        email: req.user.email,
        role: req.user.userRole,
      } : null,
    },
    requestInfo: {
      method: req.method,
      path: req.path,
      headers: headers,
    },
    tokenStatus: {
      provided: !!token,
      valid: !!tokenInfo && !tokenError,
      error: tokenError,
      decoded: tokenInfo ? {
        id: tokenInfo.id,
        email: tokenInfo.email,
        role: tokenInfo.userRole,
        iat: tokenInfo.iat,
        exp: tokenInfo.exp,
        expiresAt: tokenInfo.exp ? new Date(tokenInfo.exp * 1000).toISOString() : null,
        timeRemaining: tokenInfo.exp ? tokenInfo.exp - Math.floor(Date.now() / 1000) : null,
      } : null,
    },
    serverTime: new Date().toISOString(),
  };

  res.json(responseData);
}
