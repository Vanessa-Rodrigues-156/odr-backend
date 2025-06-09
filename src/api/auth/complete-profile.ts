import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma";

export default async function completeProfileHandler(req: Request, res: Response) {
  try {
    const { 
      userId, 
      email,
      name,
      contactNumber, 
      city, 
      country, 
      userType, 
      institution, 
      highestEducation, 
      odrLabUsage 
    } = req.body;
    
    // Either userId or email must be provided to identify the user
    if (!userId && !email) {
      return res.status(400).json({ error: "User identification (userId or email) is required" });
    }
    
    if (!contactNumber || !city || !country) {
      return res.status(400).json({ error: "Contact information and location are required" });
    }
    
    // Map frontend user types to database user roles
    const userRoleMap: Record<string, string> = {
      student: "INNOVATOR",
      professional: "OTHER",
      researcher: "OTHER",
      law: "MENTOR",
      tech: "MENTOR",
      other: "OTHER"
    };
    
    const userRole = userRoleMap[userType] || "INNOVATOR";
    
    let user;
    
    // Find user by ID or email
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } else if (email) {
      user = await prisma.user.findUnique({ where: { email } });
    }
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name || user.name,  // Use provided name or keep existing
        contactNumber,
        city,
        country,
        userRole: userRole as any ||"INNOVATOR", // Default to INNOVATOR if not provided
        institution: institution || null,
        highestEducation: highestEducation || null,
        odrLabUsage: odrLabUsage || null,
      },
    });
    
    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured!");
      return res.status(500).json({ error: "Server configuration error" });
    }
    
    const token = jwt.sign(
      { id: updatedUser.id, email: updatedUser.email, userRole: updatedUser.userRole },
      jwtSecret,
      { expiresIn: "7d" }
    );
    
    // Return user info and token
    return res.status(200).json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        userRole: updatedUser.userRole,
        contactNumber: updatedUser.contactNumber,
        city: updatedUser.city,
        country: updatedUser.country,
        institution: updatedUser.institution,
        highestEducation: updatedUser.highestEducation,
        odrLabUsage: updatedUser.odrLabUsage,
        createdAt: updatedUser.createdAt,
      },
      token,
      message: "Profile completed successfully",
    });
    
  } catch (error) {
    console.error("Profile completion error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
