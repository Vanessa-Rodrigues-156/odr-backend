import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";

function sanitizeString(str: string): string {
  return str.replace(/<script.*?>.*?<\/script>/gi, "").replace(/[<>]/g, "");
}

const checkGoogleUserSchema = z.object({
  email: z.string().email().max(200).transform((v: string) => sanitizeString(v)),
  name: z.string().min(2).max(100).transform((v: string) => sanitizeString(v)),
  imageAvatar: z.string().url().max(300).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
});

export default async function checkGoogleUserHandler(req: Request, res: Response) {
  try {
    // Validate and sanitize input
    const parseResult = checkGoogleUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
    }
    const { email, name, imageAvatar } = parseResult.data; // Include imageAvatar URL

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
