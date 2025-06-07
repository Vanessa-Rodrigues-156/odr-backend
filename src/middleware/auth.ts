import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  userRole: string;
  country?: string;
  institution?: string;
  city?: string;
  highestEducation?: string;
  contactNumber?: string;
  odrLabUsage?: string;
  createdAt?: Date;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  jwtPayload?: {
    userId: string;
    exp: number;
    iat: number;
  };
}

export const authenticateJWT = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  console.log("Authenticating request to:", req.path);

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return next(); // Allow unauthenticated requests to pass through
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret"
    ) as any;

    req.jwtPayload = decoded;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        userRole: user.userRole,
        country: user.country || undefined,
        institution: user.institution || undefined,
        city: user.city || undefined,
        highestEducation: user.highestEducation || undefined,
        contactNumber: user.contactNumber || undefined,
        odrLabUsage: user.odrLabUsage || undefined,
        createdAt: user.createdAt,
      };
    }
  } catch (err: any) {
    // Invalid token, but don't block the request
    console.warn("Invalid JWT token:", err.message);
  }

  next();
};
