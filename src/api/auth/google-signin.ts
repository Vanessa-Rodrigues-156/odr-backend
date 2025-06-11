import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma";

export default async function googleSignInHandler(req: Request, res: Response) {
  try {
    const { email, name } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ error: "Email and name are required" });
    }
    
    console.log(`Google sign-in attempt for email: ${email}`);
    
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    });
    
    let needsProfileCompletion = false;
    
    if (!user) {
      // Create new user with minimal information
      user = await prisma.user.create({
        data: {
          email,
          name,
          userRole: "INNOVATOR", // Default role
        },
      });
      needsProfileCompletion = true;
      console.log(`New user created from Google sign-in: ${email}`);
    } else if (!user.contactNumber || !user.city || !user.country) {
      // If user exists but profile is incomplete
      needsProfileCompletion = true;
      console.log(`Existing user with incomplete profile: ${email}`);
    }
    
    // Create JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured!");
      return res.status(500).json({ error: "Server configuration error" });
    }
    
    // Generate token if profile is complete
    let token = null;
    if (!needsProfileCompletion) {
      token = jwt.sign(
        { id: user.id, email: user.email, userRole: user.userRole },
        jwtSecret,
        { expiresIn: "7d" }
      );
      console.log(`Google sign-in successful with complete profile for: ${email}`);
    } else {
      console.log(`Google sign-in successful, profile completion needed for: ${email}`);
    }
    
    // Return appropriate response based on profile completion status
    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        userRole: user.userRole,
        contactNumber: user.contactNumber,
        city: user.city,
        country: user.country,
        institution: user.institution,
        highestEducation: user.highestEducation,
        odrLabUsage: user.odrLabUsage,
        createdAt: user.createdAt,
      },
      needsProfileCompletion,
      token,
      message: needsProfileCompletion 
        ? "Profile completion required" 
        : "Sign in successful",
    });
    
  } catch (error) {
    console.error("Google sign-in error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
