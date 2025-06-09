import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export default async function checkGoogleUserHandler(req: Request, res: Response) {
  try {
    const { email, name, image } = req.body; // Include image from Google

    if (!email || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if user already exists by email
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      // User exists - update Google avatar if provided and not already set
      if (image && !existingUser.imageAvatar) {
        await prisma.user.update({
          where: { email: email.toLowerCase().trim() },
          data: { imageAvatar: image }
        });
      }
      
      return res.json({
        isNewUser: false,
        user: existingUser,
        needsProfileCompletion: !existingUser.contactNumber // Check if profile is complete
      });
    } else {
      // Create basic user record for Google sign-up
      const newUser = await prisma.user.create({
        data: {
          name,
          email: email.toLowerCase().trim(),
          imageAvatar: image || null, // Store Google profile image URL
          userRole: "INNOVATOR", // Default role
          password: null, // No password for Google users
        }
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
