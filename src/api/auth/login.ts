import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import cookieParser from "cookie-parser";

function sanitizeString(str: string): string {
  return str.replace(/<script.*?>.*?<\/script>/gi, "").replace(/[<>]/g, "");
}

const loginSchema = z.object({
  email: z.string().email().max(200).transform((v: string) => sanitizeString(v)),
  password: z.string().min(8).max(100),
});

// Helper to get cookie options
function getCookieOptions(isRefresh = false) {
  return {
    httpOnly: true,
    secure: true, // Always set Secure for HTTPS (should be enforced in production)
    sameSite: "strict" as const, // Prevent CSRF by only sending cookie in first-party context
    path: "/",
    ...(isRefresh ? { maxAge: 7 * 24 * 60 * 60 * 1000 } : { maxAge: 15 * 60 * 1000 }) // 7d for refresh, 15m for access
  };
}

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
    
    // Format user data for response
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      userRole: user.userRole,
      contactNumber: user.contactNumber,
      city: user.city,
      country: user.country,
      createdAt: user.createdAt,
      ...typeSpecificData
    };
    
    // Check JWT secret is configured
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured!");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Check for mentor application status
    const hasMentorApplication = !!user.mentor;
    const isMentorApproved = user.mentor ? user.mentor.approved : false;
    const mentorRejectionReason = user.mentor ? user.mentor.rejectionReason : null;

    // Redefine userResponse with the mentor status information
    const userResponseWithMentorStatus = {
      ...userResponse,
      hasMentorApplication,
      isMentorApproved,
      mentorRejectionReason
    };

    // Generate tokens with secure, short-lived access token
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, userRole: user.userRole },
      jwtSecret,
      { expiresIn: "15m" } // Short-lived access token for security
    );
    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, userRole: user.userRole },
      jwtSecret,
      { expiresIn: "7d" } // 7 days for refresh
    );

    // Set cookies with secure flags
    res.cookie("access_token", accessToken, getCookieOptions());
    res.cookie("refresh_token", refreshToken, getCookieOptions(true));
    
    console.log(`Login successful for user: ${normalizedEmail} with role: ${user.userRole}`);
    
    // Always return user data only (never send token in response)
    return res.status(200).json({ 
      user: userResponseWithMentorStatus, 
      message: "Login successful" 
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
