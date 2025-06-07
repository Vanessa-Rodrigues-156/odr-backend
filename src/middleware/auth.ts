import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import prisma from "../lib/prisma";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  userRole: string;
  country?: string | null;
  institution?: string | null;
  city?: string | null;
  highestEducation?: string | null;
  contactNumber?: string | null;
  odrLabUsage?: string | null;
  createdAt?: Date;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  jwtPayload?: JwtPayload;
}

export const authenticateJWT = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    if (!token) {
      console.log("No token provided");
      return res.status(401).json({ error: "Access token required" });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured!");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    // Debug: Log the decoded token to see what's in it
    console.log("Decoded JWT payload:", decoded);

    // Extract user ID from different possible field names
    const userId = decoded.id || decoded.userId || decoded.sub;

    // Check if decoded token has a valid user ID field
    if (!userId) {
      console.error(
        "JWT token missing user ID field. Available fields:",
        Object.keys(decoded)
      );
      return res.status(401).json({
        error: "Invalid token format - missing user ID",
      });
    }

    req.jwtPayload = decoded;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        userRole: true,
        country: true,
        institution: true,
        city: true,
        highestEducation: true,
        contactNumber: true,
        odrLabUsage: true,
        createdAt: true,
      },
    });

    if (!user) {
      console.log(`User not found for id: ${userId}`);
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    next();
  } catch (err: any) {
    console.error("JWT verification error:", err.message);
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    return res.status(401).json({ error: "Authentication failed" });
  }
};
