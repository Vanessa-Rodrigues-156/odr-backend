import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User, AuthResponse } from "../../types/auth";
import { setAuthCookies } from "../../lib/auth-utils";

function sanitizeString(str: string): string {
  return str.replace(/<script.*?>.*?<\/script>/gi, "").replace(/[<>]/g, "");
}

const loginSchema = z.object({
  email: z.string().email().max(200).transform((v: string) => sanitizeString(v)),
  password: z.string().min(8).max(100),
});

export default async function loginHandler(req: Request, res: Response) {
  try {
    console.log("Login request received");
    
    // Validate and sanitize input
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
    }
    const { email, password } = parseResult.data;
    
    // Ensure email is a valid string and normalize it
    if (typeof email !== "string" || typeof password !== "string") {
      console.error("Login error: invalid data types", { 
        emailType: typeof email,
        passwordProvided: !!password
      });
      return res.status(400).json({ error: "Invalid input format" });
    }

    // Normalize email (lowercase)
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log(`Login attempt for email: ${normalizedEmail}`);
    
    // Find the user with a more specific select
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        innovator: true,
        mentor: true,
        faculty: true,
        other: true,
      },
    });
    
    // User not found - return generic error
    if (!user) {
      console.log(`Login failed: User not found for email: ${normalizedEmail}`);
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Check if password field exists in user object
    if (!user.password) {
      console.error(`Login error: Password field missing for user ${normalizedEmail}`);
      return res.status(500).json({ error: "Account configuration error. Please contact support." });
    }
    
    // Verify password with more error handling
    try {
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        console.log(`Login failed: Invalid password for email: ${normalizedEmail}`);
        return res.status(401).json({ error: "Invalid email or password." });
      }
    } catch (bcryptError) {
      console.error("Password comparison error:", bcryptError);
      return res.status(500).json({ error: "Authentication system error" });
    }
    
    // Remove password from user object
    const { password: _pw, ...userWithoutPassword } = user;
    
    // Extract type-specific data
    let typeSpecificData = {};
    
    // Get type-specific data based on user role
    if (user.userRole === "INNOVATOR" && user.innovator) {
      typeSpecificData = {
        institution: user.innovator.institution,
        highestEducation: user.innovator.highestEducation,
        courseName: user.innovator.courseName,
        courseStatus: user.innovator.courseStatus,
        description: user.innovator.description,
      };
    } else if (user.userRole === "MENTOR" && user.mentor) {
      typeSpecificData = {
        mentorType: user.mentor.mentorType,
        organization: user.mentor.organization,
        role: user.mentor.role,
        expertise: user.mentor.expertise,
        description: user.mentor.description,
      };
    } else if (user.userRole === "FACULTY" && user.faculty) {
      typeSpecificData = {
        institution: user.faculty.institution,
        role: user.faculty.role,
        expertise: user.faculty.expertise,
        course: user.faculty.course,
        mentoring: user.faculty.mentoring,
        description: user.faculty.description,
      };
    } else if (user.userRole === "OTHER" && user.other) {
      typeSpecificData = {
        role: user.other.role,
        workplace: user.other.workplace,
        description: user.other.description,
      };
    }

    // Check for mentor application status
    let hasMentorApplication = false;
    let isMentorApproved = false;
    let mentorRejectionReason = null;

    if (user.userRole === "MENTOR" && user.mentor) {
      hasMentorApplication = true;
      isMentorApproved = user.mentor.approved;
      mentorRejectionReason = user.mentor.rejectionReason;
    } else if (user.userRole === "OTHER" && user.mentor) {
      hasMentorApplication = true;
      isMentorApproved = user.mentor.approved;
      mentorRejectionReason = user.mentor.rejectionReason;
    }

    // Create unified user object
    const userData: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      userRole: user.userRole as "INNOVATOR" | "MENTOR" | "ADMIN" | "OTHER" | "FACULTY",
      contactNumber: user.contactNumber,
      city: user.city,
      country: user.country,
      imageAvatar: user.imageAvatar,
      createdAt: user.createdAt.toISOString(),
      ...typeSpecificData,
      hasMentorApplication,
      isMentorApproved,
      mentorRejectionReason
    };

    // Calculate if profile completion is needed
    let needsProfileCompletion = false;
    if (user.userRole === "INNOVATOR") {
      needsProfileCompletion = !userData.institution || !userData.highestEducation;
    } else if (user.userRole === "MENTOR") {
      needsProfileCompletion = !userData.mentorType || !userData.organization;
    } else if (user.userRole === "FACULTY") {
      needsProfileCompletion = !userData.institution || !userData.course;
    } else if (user.userRole === "OTHER") {
      needsProfileCompletion = !userData.workplace || !userData.role;
    }

    // Set authentication cookies using unified utility
    setAuthCookies(res, userData);
    
    console.log(`Login successful for user: ${userData.email} with role: ${userData.userRole}`);

    // Return success response
    const response: AuthResponse = {
      user: userData,
      needsProfileCompletion,
      message: "Login successful"
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Login handler error:", error);
    return res.status(500).json({
      error: "Internal server error during login"
    });
  }
}
