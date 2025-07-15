import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRole, MentorType } from "@prisma/client";
import { z } from "zod";

function sanitizeString(str: string): string {
  return str.replace(/<script.*?>.*?<\/script>/gi, "").replace(/[<>]/g, "");
}

const signupSchema = z.object({
  name: z.string().min(2).max(100).transform((v: string) => sanitizeString(v)),
  email: z.string().email().max(200).transform((v: string) => sanitizeString(v)),
  password: z.string().min(8).max(100),
  contactNumber: z.string().min(5).max(20).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  city: z.string().max(100).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  country: z.string().max(100).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  userRole: z.enum(["ADMIN", "INNOVATOR", "MENTOR", "FACULTY", "OTHER"]).optional(),
  institution: z.string().max(200).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  highestEducation: z.string().max(100).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  odrLabUsage: z.string().max(1000).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  studentInstitute: z.string().max(200).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  courseStatus: z.string().max(100).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  courseName: z.string().max(100).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  facultyInstitute: z.string().max(200).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  facultyRole: z.string().max(100).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  facultyExpertise: z.string().max(200).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  facultyCourse: z.string().max(100).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  facultyMentor: z.string().optional().nullable(),
  mentorType: z.enum(["tech", "law", "odr", "conflict"]).optional().nullable(),
  techOrg: z.string().max(200).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  lawFirm: z.string().max(200).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  techRole: z.string().max(100).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  otherWorkplace: z.string().max(200).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  otherRole: z.string().max(100).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  mainUserType: z.string().max(100).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
  userType: z.string().max(100).optional().nullable().transform((v: string | null | undefined) => (v ? sanitizeString(v) : v)),
});

// Helper to get cookie options
function getCookieOptions(isRefresh = false) {
  return {
    httpOnly: true,
    secure: true, // Always secure in production
    sameSite: "none" as const, // Allow cross-origin cookies for production
    path: "/",
    ...(isRefresh ? { maxAge: 7 * 24 * 60 * 60 * 1000 } : { maxAge: 15 * 60 * 1000 })
  };
}

export default async function signupHandler(req: Request, res: Response) {
  console.log("Signup request received:", JSON.stringify(req.body, null, 2));
  
  // Validate and sanitize input
  const parseResult = signupSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
  }
  const {
    name,
    email,
    password,
    contactNumber,
    city,
    country,
    userRole,
    // Common fields that will go to specific tables
    institution,
    highestEducation,
    odrLabUsage,
    // Student/Innovator fields
    studentInstitute,
    courseStatus,
    courseName,
    // Faculty fields
    facultyInstitute,
    facultyRole,
    facultyExpertise,
    facultyCourse,
    facultyMentor,
    // Mentor fields
    mentorType,
    techOrg,
    lawFirm,
    techRole,
    // Other fields
    otherWorkplace,
    otherRole,
    // Additional fields
    mainUserType,
    userType
  } = parseResult.data;

  // Basic validation
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Name, email, and password are required." });
  }

  // Check for existing user
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: "Email already in use." });
  }

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Determine the correct user role
    let finalUserRole: UserRole;
    
    // For mentor types, always set to OTHER initially regardless of what was passed
    if ((userType === "tech" || userType === "law" || userType === "odr" || userType === "conflict" || 
         mainUserType === "mentor" || mentorType)) {
      finalUserRole = "OTHER"; // Register as OTHER first, will be changed to MENTOR upon approval
    } else if (userType === "student" || mainUserType === "student") {
      finalUserRole = "INNOVATOR";
    } else if (userType === "faculty" || mainUserType === "faculty") {
      finalUserRole = "FACULTY";
    } else {
      finalUserRole = userRole as UserRole || "OTHER";
    }

    // Create user using Prisma transaction to ensure data consistency across tables
    const user = await prisma.$transaction(async (tx) => {
      // Create the base user record
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          userRole: finalUserRole,
          contactNumber: contactNumber || null,
          city: city || null,
          country: country || null,
        },
      });

      // Create role-specific records based on user role
      switch (finalUserRole) {
        case "INNOVATOR":
          await tx.innovator.create({
            data: {
              userId: user.id,
              institution: studentInstitute || institution || null,
              highestEducation: highestEducation || null,
              courseName: courseName || null,
              courseStatus: courseStatus || null,
              description: odrLabUsage || null
            }
          });
          break;

        case "OTHER":
          // Check if this user intended to be a mentor (applied as mentor but starting as OTHER)
          if (mentorType === "tech" || userType === "tech" || mentorType === "law" || userType === "law" || 
              mentorType === "odr" || userType === "odr" || mentorType === "conflict" || userType === "conflict" ||
              mainUserType === "mentor") {
            
            // Determine mentor type from form data
            let finalMentorType: MentorType;
            if (mentorType === "tech" || userType === "tech") {
              finalMentorType = "TECHNICAL_EXPERT";
            } else if (mentorType === "law" || userType === "law") {
              finalMentorType = "LEGAL_EXPERT";
            } else if (mentorType === "odr" || userType === "odr") {
              finalMentorType = "ODR_EXPERT";
            } else if (mentorType === "conflict" || userType === "conflict") {
              finalMentorType = "CONFLICT_RESOLUTION_EXPERT";
            } else {
              finalMentorType = "TECHNICAL_EXPERT"; // Default
            }

            // Determine organization based on mentor type
            let organization = "";
            let role = "";

            if (finalMentorType === "TECHNICAL_EXPERT") {
              organization = techOrg || institution || "";
              role = techRole || "";
            } else if (finalMentorType === "LEGAL_EXPERT") {
              organization = lawFirm || institution || "";
            } else {
              organization = institution || "";
            }

            // Create both mentor record (pending approval) and other record (current status)
            await tx.mentor.create({
              data: {
                userId: user.id,
                mentorType: finalMentorType,
                organization,
                role,
                description: odrLabUsage || null,
                approved: false
              }
            });
            
            // Also create an entry in the "other" table since their current role is OTHER
            await tx.other.create({
              data: {
                userId: user.id,
                role: `Pending ${finalMentorType.replace('_', ' ')} approval`,
                workplace: organization || null,
                description: odrLabUsage || null
              }
            });
          } else {
            // Regular OTHER user
            await tx.other.create({
              data: {
                userId: user.id,
                role: otherRole || null,
                workplace: otherWorkplace || institution || null,
                description: odrLabUsage || null
              }
            });
          }
          break;

        case "FACULTY":
          await tx.faculty.create({
            data: {
              userId: user.id,
              institution: facultyInstitute || institution || null,
              role: facultyRole || null,
              expertise: facultyExpertise || null,
              course: facultyCourse || null,
              mentoring: facultyMentor === "yes" || false,
              description: odrLabUsage || null
            }
          });
          break;

        default: // OTHER
          await tx.other.create({
            data: {
              userId: user.id,
              role: otherRole || null,
              workplace: otherWorkplace || institution || null,
              description: odrLabUsage || null
            }
          });
          break;
      }

      return user;
    });

    // Check JWT secret configuration
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured!");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Generate tokens with longer expiration for better UX
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, userRole: user.userRole },
      jwtSecret,
      { expiresIn: "24h" } // Increased from 15m to 24h
    );
    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, userRole: user.userRole },
      jwtSecret,
      { expiresIn: "30d" } // Increased from 7d to 30d
    );
    res.cookie("access_token", accessToken, getCookieOptions());
    res.cookie("refresh_token", refreshToken, getCookieOptions(true));
    // Fetch the complete user data including type-specific information
    const userData = await getUserWithTypeData(user.id, user.userRole);

    // Always return user data only (never send token in response)
    return res.status(201).json({ user: userData });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ error: "Error creating user account." });
  }
}

// Helper function to fetch user data with their type-specific information
async function getUserWithTypeData(userId: string, userRole: UserRole) {
  const baseUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      userRole: true,
      contactNumber: true,
      city: true,
      country: true,
      createdAt: true,
    },
  });

  if (!baseUser) return null;

  let additionalData = {};

  switch (userRole) {
    case "INNOVATOR":
      additionalData = await prisma.innovator.findUnique({
        where: { userId },
        select: {
          institution: true,
          highestEducation: true,
          courseName: true, 
          courseStatus: true,
          description: true
        }
      }) || {};
      break;

    case "MENTOR":
      additionalData = await prisma.mentor.findUnique({
        where: { userId },
        select: {
          mentorType: true,
          organization: true,
          role: true,
          expertise: true,
          description: true
        }
      }) || {};
      break;

    case "FACULTY":
      additionalData = await prisma.faculty.findUnique({
        where: { userId },
        select: {
          institution: true,
          role: true,
          expertise: true,
          course: true,
          mentoring: true,
          description: true
        }
      }) || {};
      break;

    default: // OTHER
      additionalData = await prisma.other.findUnique({
        where: { userId },
        select: {
          role: true,
          workplace: true,
          description: true
        }
      }) || {};
      break;
  }

  return { ...baseUser, ...additionalData };
}
