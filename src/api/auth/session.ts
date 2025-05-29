import { Request, Response } from "express";
import { AuthRequest, AuthUser } from "../../middleware/auth";

export default async function sessionHandler(req: AuthRequest, res: Response) {
  console.log("Session check requested");
  
  if (!req.user) {
    console.log("Session check failed: No authenticated user");
    return res.status(401).json({ 
      authenticated: false,
      error: "Not authenticated" 
    });
  }
  // Format user data for consistent response
  const user: AuthUser = {
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    userRole: req.user.userRole,
    contactNumber: req.user.contactNumber,
    city: req.user.city,
    country: req.user.country,
    institution: req.user.institution,
    highestEducation: req.user.highestEducation,
    odrLabUsage: req.user.odrLabUsage,
    createdAt: req.user.createdAt,
  };
  
  // Log successful session check
  console.log(`Session valid for user: ${user.email} with role: ${user.userRole}`);
  
  // Return session data
  return res.status(200).json({ 
    authenticated: true,
    user,
    // If we have jwt payload with expiration, include time remaining
    ...(req.jwtPayload?.exp ? {
      expiresAt: new Date(req.jwtPayload.exp * 1000).toISOString(),
      expiresIn: req.jwtPayload.exp - Math.floor(Date.now() / 1000)
    } : {})
  });
}
