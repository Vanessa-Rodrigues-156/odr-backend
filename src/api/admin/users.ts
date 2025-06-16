import { Router, Response, NextFunction } from "express";
import { authenticateJWT, AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";

const router = Router();
router.use(authenticateJWT);

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.userRole !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// List all users (no password)
router.get("/", requireAdmin, async (req: AuthRequest, res: Response) => {
  // Get base user data
  const users = await prisma.user.findMany({
    include: {
      innovator: true,
      mentor: true,
      faculty: true,
      other: true,
    },
  });
  
  // Map to a unified format for the frontend
  const mappedUsers = users.map(user => {
    let typeSpecificData = {};
    
    // Get type-specific data based on user role
    if (user.userRole === "INNOVATOR" && user.innovator) {
      typeSpecificData = {
        institution: user.innovator.institution,
        highestEducation: user.innovator.highestEducation,
        odrLabUsage: user.innovator.description,
        courseName: user.innovator.courseName,
        courseStatus: user.innovator.courseStatus,
      };
    } else if (user.userRole === "MENTOR" && user.mentor) {
      typeSpecificData = {
        institution: user.mentor.organization,
        odrLabUsage: user.mentor.description,
        mentorType: user.mentor.mentorType,
        role: user.mentor.role,
        expertise: user.mentor.expertise,
      };
    } else if (user.userRole === "FACULTY" && user.faculty) {
      typeSpecificData = {
        institution: user.faculty.institution,
        odrLabUsage: user.faculty.description,
        role: user.faculty.role,
        expertise: user.faculty.expertise,
        course: user.faculty.course,
        mentoring: user.faculty.mentoring,
      };
    } else if (user.other) {
      typeSpecificData = {
        institution: user.other.workplace,
        odrLabUsage: user.other.description,
        role: user.other.role,
      };
    }
    
    // Remove relationship objects to avoid sending too much data
    const { innovator, mentor, faculty, other, password, ...baseUser } = user;
    
    // Return combined data
    return {
      ...baseUser,
      ...typeSpecificData
    };
  });
  
  res.json(mappedUsers);
});

// Get user by id
router.get("/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      innovator: true,
      mentor: true,
      faculty: true,
      other: true,
    },
  });
  
  if (!user) return res.status(404).json({ error: "User not found" });

  let typeSpecificData = {};
  
  // Get type-specific data based on user role
  if (user.userRole === "INNOVATOR" && user.innovator) {
    typeSpecificData = {
      institution: user.innovator.institution,
      highestEducation: user.innovator.highestEducation,
      odrLabUsage: user.innovator.description,
      courseName: user.innovator.courseName,
      courseStatus: user.innovator.courseStatus,
    };
  } else if (user.userRole === "MENTOR" && user.mentor) {
    typeSpecificData = {
      institution: user.mentor.organization,
      odrLabUsage: user.mentor.description,
      mentorType: user.mentor.mentorType,
      role: user.mentor.role,
      expertise: user.mentor.expertise,
    };
  } else if (user.userRole === "FACULTY" && user.faculty) {
    typeSpecificData = {
      institution: user.faculty.institution,
      odrLabUsage: user.faculty.description,
      role: user.faculty.role,
      expertise: user.faculty.expertise,
      course: user.faculty.course,
      mentoring: user.faculty.mentoring,
    };
  } else if (user.other) {
    typeSpecificData = {
      institution: user.other.workplace,
      odrLabUsage: user.other.description,
      role: user.other.role,
    };
  }
  
  // Remove relationship objects to avoid sending too much data
  const { innovator, mentor, faculty, other, password, ...baseUser } = user;
  
  // Return combined data
  res.json({
    ...baseUser,
    ...typeSpecificData
  });
});

// Update user (role or info)
router.put("/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  const {
    name,
    userRole,
    contactNumber,
    city,
    country,
    institution,
    highestEducation,
    odrLabUsage,
    mentorType,
    organization,
    role,
    expertise,
    workplace,
    courseName,
    courseStatus,
    course,
    mentoring
  } = req.body;

  const userId = req.params.id;
  
  // Get the user to determine their current role
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

  // Update the user in a transaction to ensure data consistency
  const result = await prisma.$transaction(async (prismaClient) => {
    // Update base user data
    const updatedUser = await prismaClient.user.update({
      where: { id: userId },
      data: {
        name,
        userRole: userRole || existingUser.userRole,
        contactNumber,
        city,
        country,
        updatedAt: new Date()
      },
    });

    // Update type-specific data based on user role
    const targetUserRole = userRole || existingUser.userRole;
    
    if (targetUserRole === "INNOVATOR") {
      await prismaClient.innovator.upsert({
        where: { userId },
        update: {
          institution,
          highestEducation,
          courseName,
          courseStatus,
          description: odrLabUsage
        },
        create: {
          userId,
          institution,
          highestEducation,
          courseName,
          courseStatus,
          description: odrLabUsage
        }
      });
    } else if (targetUserRole === "MENTOR") {
      await prismaClient.mentor.upsert({
        where: { userId },
        update: {
          mentorType: mentorType || existingUser.mentor?.mentorType || "TECHNICAL_EXPERT",
          organization: organization || institution,
          role,
          expertise,
          description: odrLabUsage
        },
        create: {
          userId,
          mentorType: mentorType || "TECHNICAL_EXPERT",
          organization: organization || institution,
          role,
          expertise,
          description: odrLabUsage
        }
      });
    } else if (targetUserRole === "FACULTY") {
      await prismaClient.faculty.upsert({
        where: { userId },
        update: {
          institution,
          role,
          expertise,
          course,
          mentoring: mentoring || false,
          description: odrLabUsage
        },
        create: {
          userId,
          institution,
          role,
          expertise,
          course,
          mentoring: mentoring || false,
          description: odrLabUsage
        }
      });
    } else if (targetUserRole === "OTHER") {
      await prismaClient.other.upsert({
        where: { userId },
        update: {
          role,
          workplace: workplace || institution,
          description: odrLabUsage
        },
        create: {
          userId,
          role,
          workplace: workplace || institution,
          description: odrLabUsage
        }
      });
    }
    
    return updatedUser;
  });
  
  // Fetch the updated user with all related data
  const updatedUserWithRelatedData = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      innovator: true,
      mentor: true,
      faculty: true,
      other: true
    }
  });
  
  res.json({ success: true, user: updatedUserWithRelatedData });
});

// Delete user
router.delete("/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Get user by email (for testing password)
router.get("/email/:email", async (req: AuthRequest, res: Response) => {
  const { email } = req.params;
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      innovator: true,
      mentor: true,
      faculty: true,
      other: true,
    },
  });
  
  if (!user) return res.status(404).json({ error: "User not found" });

  let typeSpecificData = {};
  
  // Get type-specific data based on user role
  if (user.userRole === "INNOVATOR" && user.innovator) {
    typeSpecificData = {
      institution: user.innovator.institution,
      highestEducation: user.innovator.highestEducation,
      odrLabUsage: user.innovator.description,
      courseName: user.innovator.courseName,
      courseStatus: user.innovator.courseStatus,
    };
  } else if (user.userRole === "MENTOR" && user.mentor) {
    typeSpecificData = {
      institution: user.mentor.organization,
      odrLabUsage: user.mentor.description,
      mentorType: user.mentor.mentorType,
      role: user.mentor.role,
      expertise: user.mentor.expertise,
    };
  } else if (user.userRole === "FACULTY" && user.faculty) {
    typeSpecificData = {
      institution: user.faculty.institution,
      odrLabUsage: user.faculty.description,
      role: user.faculty.role,
      expertise: user.faculty.expertise,
      course: user.faculty.course,
      mentoring: user.faculty.mentoring,
    };
  } else if (user.other) {
    typeSpecificData = {
      institution: user.other.workplace,
      odrLabUsage: user.other.description,
      role: user.other.role,
    };
  }
  
  // Return combined data with password for authentication
  res.json({
    ...user,
    ...typeSpecificData
  });
});

export default router;
