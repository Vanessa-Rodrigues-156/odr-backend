import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import bcrypt from "bcryptjs";
import { UserRole, MentorType } from "@prisma/client";

export default async function signupHandler(req: Request, res: Response) {
  console.log("Signup request received:", JSON.stringify(req.body, null, 2));
  
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
  } = req.body;

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
    let finalUserRole = userRole as UserRole;
    if (!finalUserRole) {
      if (userType === "student" || mainUserType === "student") {
        finalUserRole = "INNOVATOR";
      } else if (userType === "faculty" || mainUserType === "faculty") {
        finalUserRole = "FACULTY";
      } else if (userType === "tech" || userType === "law" || userType === "odr" || userType === "conflict" || 
                mainUserType === "mentor" || mentorType) {
        finalUserRole = "MENTOR";
      } else {
        finalUserRole = "OTHER";
      }
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

        case "MENTOR":
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

          await tx.mentor.create({
            data: {
              userId: user.id,
              mentorType: finalMentorType,
              organization,
              role,
              description: odrLabUsage || null
            }
          });
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

    // For frontend auto-login, return a JWT token as well
    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      { id: user.id, email: user.email, userRole: user.userRole },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Fetch the complete user data including type-specific information
    const userData = await getUserWithTypeData(user.id, user.userRole);

    res.status(201).json({ user: userData, token });
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
