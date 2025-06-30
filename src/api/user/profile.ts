import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticateJWT } from "../../middleware/auth";

// GET /api/user/profile - Get current user profile
export async function getUserProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "User ID not found in request" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        innovator: true,
        mentor: true,
        faculty: true,
        other: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// PUT /api/user/profile - Update user profile
export async function updateUserProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "User ID not found in request" });
    }
    
    const {
      name,
      imageAvatar,
      contactNumber,
      country,
      city,
      // Role-specific fields
      institution,
      organization,
      workplace,
      role,
      highestEducation,
      courseName,
      courseStatus,
      expertise,
      course,
      mentoring,
      description
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Validate image URL if provided
    if (imageAvatar && imageAvatar.trim()) {
      try {
        new URL(imageAvatar);
        // Check if it's a valid image URL
        const validImageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
        const isGoogleUserContent = imageAvatar.includes('googleusercontent.com');
        const isGitHubUserContent = imageAvatar.includes('githubusercontent.com');
        
        if (!validImageExtensions.test(imageAvatar) && !isGoogleUserContent && !isGitHubUserContent) {
          return res.status(400).json({ error: "Please provide a valid image URL" });
        }
      } catch {
        return res.status(400).json({ error: "Please provide a valid image URL" });
      }
    }

    // Get user to check their role
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        innovator: true,
        mentor: true,
        faculty: true,
        other: true
      }
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update user profile (base User table fields)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name.trim(),
        imageAvatar: imageAvatar?.trim() || null,
        contactNumber: contactNumber?.trim() || null,
        country: country?.trim() || null,
        city: city?.trim() || null,
        updatedAt: new Date()
      }
    });

    // Update role-specific data based on user's role
    if (existingUser.userRole === 'INNOVATOR') {
      if (existingUser.innovator) {
        await prisma.innovator.update({
          where: { userId: userId },
          data: {
            institution: institution?.trim() || null,
            highestEducation: highestEducation?.trim() || null,
            courseName: courseName?.trim() || null,
            courseStatus: courseStatus?.trim() || null,
            description: description?.trim() || null
          }
        });
      } else {
        // Create innovator record if it doesn't exist
        await prisma.innovator.create({
          data: {
            userId: userId,
            institution: institution?.trim() || null,
            highestEducation: highestEducation?.trim() || null,
            courseName: courseName?.trim() || null,
            courseStatus: courseStatus?.trim() || null,
            description: description?.trim() || null
          }
        });
      }
    } else if (existingUser.userRole === 'MENTOR') {
      if (existingUser.mentor) {
        await prisma.mentor.update({
          where: { userId: userId },
          data: {
            organization: organization?.trim() || null,
            role: role?.trim() || null,
            expertise: expertise?.trim() || null,
            description: description?.trim() || null
          }
        });
      } else {
        // Create mentor record if it doesn't exist
        await prisma.mentor.create({
          data: {
            userId: userId,
            mentorType: 'TECHNICAL_EXPERT', // Default mentor type, can be updated later
            organization: organization?.trim() || null,
            role: role?.trim() || null,
            expertise: expertise?.trim() || null,
            description: description?.trim() || null
          }
        });
      }
    } else if (existingUser.userRole === 'FACULTY') {
      if (existingUser.faculty) {
        await prisma.faculty.update({
          where: { userId: userId },
          data: {
            institution: institution?.trim() || null,
            role: role?.trim() || null,
            expertise: expertise?.trim() || null,
            course: course?.trim() || null,
            mentoring: typeof mentoring === 'boolean' ? mentoring : (mentoring === 'true'),
            description: description?.trim() || null
          }
        });
      } else {
        // Create faculty record if it doesn't exist
        await prisma.faculty.create({
          data: {
            userId: userId,
            institution: institution?.trim() || null,
            role: role?.trim() || null,
            expertise: expertise?.trim() || null,
            course: course?.trim() || null,
            mentoring: typeof mentoring === 'boolean' ? mentoring : (mentoring === 'true'),
            description: description?.trim() || null
          }
        });
      }
    } else if (existingUser.userRole === 'OTHER') {
      if (existingUser.other) {
        await prisma.other.update({
          where: { userId: userId },
          data: {
            workplace: workplace?.trim() || null,
            role: role?.trim() || null,
            description: description?.trim() || null
          }
        });
      } else {
        // Create other record if it doesn't exist
        await prisma.other.create({
          data: {
            userId: userId,
            workplace: workplace?.trim() || null,
            role: role?.trim() || null,
            description: description?.trim() || null
          }
        });
      }
    }

    // Fetch updated user with all relations
    const finalUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        innovator: true,
        mentor: true,
        faculty: true,
        other: true
      }
    });

    res.json({
      message: "Profile updated successfully",
      user: finalUser
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Combined handler for the route
export default async function profileHandler(req: Request, res: Response) {
  // Authentication is already handled by app.use("/api/user", authenticateJWT, userRoutes);
  // No need to apply it again here

  if (req.method === 'GET') {
    return getUserProfile(req, res);
  } else if (req.method === 'PUT') {
    return updateUserProfile(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
