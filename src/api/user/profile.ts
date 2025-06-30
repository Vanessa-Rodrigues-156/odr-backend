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

    // Validate image URL if provided and not null
    if (imageAvatar !== null && imageAvatar !== undefined && imageAvatar.trim()) {
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
    const updateData: any = {
      updatedAt: new Date()
    };
    
    // Only include fields in the update data if they're not null
    if (name !== null && name !== undefined) {
      updateData.name = name.trim();
    }
    
    if (imageAvatar !== null && imageAvatar !== undefined) {
      // If imageAvatar is an empty string after trimming, set it to null
      // Otherwise use the trimmed value
      updateData.imageAvatar = imageAvatar.trim() || null;
    }
    // If imageAvatar is null or undefined, it's not included in the update at all
    
    if (contactNumber !== null && contactNumber !== undefined) {
      updateData.contactNumber = contactNumber.trim() || null;
    }
    
    if (country !== null && country !== undefined) {
      updateData.country = country.trim() || null;
    }
    
    if (city !== null && city !== undefined) {
      updateData.city = city.trim() || null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    // Update role-specific data based on user's role
    if (existingUser.userRole === 'INNOVATOR') {
      if (existingUser.innovator) {
        const innovatorUpdateData: any = {};
        
        if (institution !== null && institution !== undefined) {
          innovatorUpdateData.institution = institution.trim() || null;
        }
        
        if (highestEducation !== null && highestEducation !== undefined) {
          innovatorUpdateData.highestEducation = highestEducation.trim() || null;
        }
        
        if (courseName !== null && courseName !== undefined) {
          innovatorUpdateData.courseName = courseName.trim() || null;
        }
        
        if (courseStatus !== null && courseStatus !== undefined) {
          innovatorUpdateData.courseStatus = courseStatus.trim() || null;
        }
        
        if (description !== null && description !== undefined) {
          innovatorUpdateData.description = description.trim() || null;
        }
        
        // Only update if there are fields to update
        if (Object.keys(innovatorUpdateData).length > 0) {
          await prisma.innovator.update({
            where: { userId: userId },
            data: innovatorUpdateData
          });
        }
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
        const mentorUpdateData: any = {};
        
        if (organization !== null && organization !== undefined) {
          mentorUpdateData.organization = organization.trim() || null;
        }
        
        if (role !== null && role !== undefined) {
          mentorUpdateData.role = role.trim() || null;
        }
        
        if (expertise !== null && expertise !== undefined) {
          mentorUpdateData.expertise = expertise.trim() || null;
        }
        
        if (description !== null && description !== undefined) {
          mentorUpdateData.description = description.trim() || null;
        }
        
        // Only update if there are fields to update
        if (Object.keys(mentorUpdateData).length > 0) {
          await prisma.mentor.update({
            where: { userId: userId },
            data: mentorUpdateData
          });
        }
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
        const facultyUpdateData: any = {};
        
        if (institution !== null && institution !== undefined) {
          facultyUpdateData.institution = institution.trim() || null;
        }
        
        if (role !== null && role !== undefined) {
          facultyUpdateData.role = role.trim() || null;
        }
        
        if (expertise !== null && expertise !== undefined) {
          facultyUpdateData.expertise = expertise.trim() || null;
        }
        
        if (course !== null && course !== undefined) {
          facultyUpdateData.course = course.trim() || null;
        }
        
        if (mentoring !== null && mentoring !== undefined) {
          facultyUpdateData.mentoring = typeof mentoring === 'boolean' ? mentoring : (mentoring === 'true');
        }
        
        if (description !== null && description !== undefined) {
          facultyUpdateData.description = description.trim() || null;
        }
        
        // Only update if there are fields to update
        if (Object.keys(facultyUpdateData).length > 0) {
          await prisma.faculty.update({
            where: { userId: userId },
            data: facultyUpdateData
          });
        }
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
        const otherUpdateData: any = {};
        
        if (workplace !== null && workplace !== undefined) {
          otherUpdateData.workplace = workplace.trim() || null;
        }
        
        if (role !== null && role !== undefined) {
          otherUpdateData.role = role.trim() || null;
        }
        
        if (description !== null && description !== undefined) {
          otherUpdateData.description = description.trim() || null;
        }
        
        // Only update if there are fields to update
        if (Object.keys(otherUpdateData).length > 0) {
          await prisma.other.update({
            where: { userId: userId },
            data: otherUpdateData
          });
        }
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
