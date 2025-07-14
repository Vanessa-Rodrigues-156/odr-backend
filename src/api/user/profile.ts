import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { logAuditEvent } from "../../lib/auditLog";
import { authenticateJWT } from "../../middleware/auth";
import rateLimit from "express-rate-limit";

// Helper: Remove script tags and dangerous characters
function sanitizeString(str: string): string {
  return str.replace(/<script.*?>.*?<\/script>/gi, "").replace(/[<>]/g, "");
}

// Zod schema for user profile update
const profileSchema = z.object({
  name: z.string().min(2).max(100).transform((v: string) => sanitizeString(v)),
  imageAvatar: z.string().url().max(300).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  contactNumber: z.string().min(5).max(20).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  country: z.string().max(100).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  city: z.string().max(100).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  institution: z.string().max(200).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  organization: z.string().max(200).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  workplace: z.string().max(200).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  role: z.string().max(100).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  highestEducation: z.string().max(100).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  courseName: z.string().max(100).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  courseStatus: z.string().max(100).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  expertise: z.string().max(200).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  course: z.string().max(100).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  mentoring: z.union([z.boolean(), z.string()]).optional().nullable(),
  description: z.string().max(1000).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
});

// Rate limiter for profile update (20 requests per 10 minutes)
const formLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  message: { error: "Too many profile update attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

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
  let success = false;
  let message = '';
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User ID not found in request" });
    }

    // Validate and sanitize input
    const parseResult = profileSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
    }
    const {
      name,
      imageAvatar,
      contactNumber,
      country,
      city,
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
    } = parseResult.data;

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
    success = true;
    message = 'Profile updated successfully';

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

    await logAuditEvent({
      action: 'UPDATE_PROFILE',
      userId: userId,
      userRole: existingUser.userRole as any,
      targetId: userId,
      targetType: 'USER',
      success,
      message,
      ipAddress: req.ip,
    });
    res.json({
      message: "Profile updated successfully",
      user: finalUser
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
    await logAuditEvent({
      action: 'UPDATE_PROFILE',
      userId: (req as any).user?.id,
      userRole: undefined,
      targetId: (req as any).user?.id,
      targetType: 'USER',
      success: false,
      message,
      ipAddress: req.ip,
    });
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Combined handler for the route
export default async function profileHandler(req: Request, res: Response) {
  if (req.method === 'PUT') {
    // Apply rate limiter only for PUT (profile update)
    // @ts-ignore
    return formLimiter(req, res, () => updateUserProfile(req, res));
  }
  if (req.method === 'GET') {
    return getUserProfile(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
