import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";

// Extend the JWT payload type
interface JwtPayload {
  id: string;
  email: string;
  userRole: string;
  iat?: number;
  exp?: number;
}

// Define a more specific user type
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  userRole: string;
  contactNumber: string | null;
  city: string | null;
  country: string | null;
  institution: string | null;
  highestEducation: string | null;
  odrLabUsage: string | null;
  createdAt: Date | string;
}

// Extended Request with typed user
export interface AuthRequest extends Request {
  user?: AuthUser;
  jwtPayload?: JwtPayload;
}

export function authenticateJWT(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  console.log("Authenticating request to:", req.path);
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("No Bearer token provided");
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];
  
  try {
    // Verify the token
    const jwtPayload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    
    // Set the JWT payload on the request
    req.jwtPayload = jwtPayload;
    
    // Fetch the complete user from the database
    prisma.user.findUnique({
      where: { id: jwtPayload.id },
      select: {
        id: true,
        name: true,
        email: true,
        userRole: true,
        contactNumber: true,
        city: true,
        country: true,
        institution: true,
        highestEducation: true,
        odrLabUsage: true,
        createdAt: true,
      },
    })
    .then(user => {
      if (!user) {
        console.log(`User not found for token with id: ${jwtPayload.id}`);
        return res.status(401).json({ error: "User not found" });
      }
      
      // Set the user on the request - user object from database matches our AuthUser interface now
      req.user = user;
      console.log(`Authenticated user: ${user.email} with role: ${user.userRole}`);
      next();
    })
    .catch(err => {
      console.error("Database error in auth middleware:", err);
      return res.status(500).json({ error: "Internal server error" });
    });
  } catch (err) {
    console.error("JWT verification error:", err);
    if (err instanceof jwt.JsonWebTokenError) {
      if (err instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: "Token expired" });
      } else {
        return res.status(401).json({ error: "Invalid token" });
      }
    }
    return res.status(401).json({ error: "Authentication failed" });
  }
}
