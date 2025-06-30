import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export default async function checkGoogleUserHandler(req: Request, res: Response) {
  try {
    const { email, name, imageAvatar } = req.body; // Include imageAvatar URL

    if (!email || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if user already exists by email
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        innovator: true,
        mentor: true,
        faculty: true, 
        other: true
      }
    });

    if (existingUser) {
      return res.json({
        isNewUser: false,
        user: existingUser,
        needsProfileCompletion: !existingUser.contactNumber // Check if profile is complete
      });
    } else {
      // Create basic user record for Google sign-up with role-specific record
      const newUser = await prisma.$transaction(async (prisma) => {
        const user = await prisma.user.create({
          data: {
            name,
            email: email.toLowerCase().trim(),
            imageAvatar: imageAvatar || null, // Store the image URL
            userRole: "INNOVATOR", // Default role
            password: null, // No password for Google users
          }
        });
        
        // Create corresponding Innovator record since default role is INNOVATOR
        await prisma.innovator.create({
          data: {
            userId: user.id,
          }
        });
        
        return user;
      });

      return res.json({
        isNewUser: true,
        user: newUser,
        needsProfileCompletion: true
      });
    }
  } catch (error) {
    console.error("Error checking Google user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
