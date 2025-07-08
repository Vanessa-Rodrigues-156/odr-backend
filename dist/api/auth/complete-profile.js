"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = completeProfileHandler;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const zod_1 = require("zod");
function sanitizeString(str) {
    return str.replace(/<script.*?>.*?<\/script>/gi, "").replace(/[<>]/g, "");
}
const completeProfileSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid().optional(),
    email: zod_1.z.string().email().max(200).optional(),
    name: zod_1.z.string().min(2).max(100).optional(),
    contactNumber: zod_1.z.string().min(5).max(20).optional(),
    city: zod_1.z.string().max(100).optional(),
    country: zod_1.z.string().max(100).optional(),
    userType: zod_1.z.string().max(100).optional(),
    institution: zod_1.z.string().max(200).optional().nullable(),
    highestEducation: zod_1.z.string().max(100).optional().nullable(),
    mentorType: zod_1.z.enum(["TECHNICAL_EXPERT", "LEGAL_EXPERT", "ODR_EXPERT", "CONFLICT_RESOLUTION_EXPERT"]).optional().nullable(),
    organization: zod_1.z.string().max(200).optional().nullable(),
    expertise: zod_1.z.string().max(200).optional().nullable(),
    role: zod_1.z.string().max(100).optional().nullable(),
    courseName: zod_1.z.string().max(100).optional().nullable(),
    courseStatus: zod_1.z.string().max(100).optional().nullable(),
    description: zod_1.z.string().max(1000).optional().nullable(),
    workplace: zod_1.z.string().max(200).optional().nullable(),
});
// Helper to get cookie options
function getCookieOptions(isRefresh = false) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        ...(isRefresh ? { maxAge: 7 * 24 * 60 * 60 * 1000 } : { maxAge: 15 * 60 * 1000 })
    };
}
async function completeProfileHandler(req, res) {
    try {
        // Validate and sanitize input
        const parseResult = completeProfileSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
        }
        const { userId, email, name, contactNumber, city, country, userType, institution, highestEducation, mentorType, organization, expertise, role, courseName, courseStatus, description, workplace } = parseResult.data;
        // Either userId or email must be provided to identify the user
        if (!userId && !email) {
            return res.status(400).json({ error: "User identification (userId or email) is required" });
        }
        if (!contactNumber || !city || !country) {
            return res.status(400).json({ error: "Contact information and location are required" });
        }
        // Map frontend user types to database user roles
        const userRoleMap = {
            student: "INNOVATOR",
            professional: "OTHER",
            researcher: "OTHER",
            law: "MENTOR",
            tech: "MENTOR",
            faculty: "FACULTY",
            other: "OTHER"
        };
        // userType comes from the frontend as a string (e.g., "student", "faculty", "mentor", "tech", "law", etc.)
        // The userRoleMap is an index type so we can map any string userType to a backend UserRole enum value.
        // This allows flexibility if the frontend sends different userType strings.
        // If the userType is not found in the map, default to "INNOVATOR".
        const userRole = userRoleMap[userType ?? ""] || "INNOVATOR";
        let user;
        // Find user by ID or email
        if (userId) {
            user = await prisma_1.default.user.findUnique({
                where: { id: userId },
                include: {
                    innovator: true,
                    mentor: true,
                    faculty: true,
                    other: true,
                }
            });
        }
        else if (email) {
            user = await prisma_1.default.user.findUnique({
                where: { email },
                include: {
                    innovator: true,
                    mentor: true,
                    faculty: true,
                    other: true,
                }
            });
        }
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        // Update user profile using transaction to handle role-specific tables
        const updatedUser = await prisma_1.default.$transaction(async (prisma) => {
            // Update only the base user fields that exist in the User model
            const updatedBaseUser = await prisma.user.update({
                where: { id: user.id },
                data: {
                    name: name || user.name,
                    contactNumber,
                    city,
                    country,
                    userRole,
                    // Remove these fields as they don't exist in User model
                    // institution: institution || null,
                    // highestEducation: highestEducation || null,
                    // odrLabUsage: odrLabUsage || null,
                },
                include: {
                    innovator: true,
                    mentor: true,
                    faculty: true,
                    other: true,
                }
            });
            // Handle role-specific tables based on the userRole
            // First, clean up any existing role-specific records if the role has changed
            const previousRole = user.userRole;
            if (previousRole !== userRole) {
                if (previousRole === "INNOVATOR" && user.innovator) {
                    await prisma.innovator.delete({ where: { userId: user.id } });
                }
                else if (previousRole === "MENTOR" && user.mentor) {
                    await prisma.mentor.delete({ where: { userId: user.id } });
                }
                else if (previousRole === "FACULTY" && user.faculty) {
                    await prisma.faculty.delete({ where: { userId: user.id } });
                }
                else if (previousRole === "OTHER" && user.other) {
                    await prisma.other.delete({ where: { userId: user.id } });
                }
            }
            // Create appropriate role-specific record
            switch (userRole) {
                case "INNOVATOR":
                    if (!user.innovator) {
                        await prisma.innovator.create({
                            data: {
                                userId: user.id,
                                institution,
                                highestEducation,
                                courseName,
                                courseStatus,
                                description,
                            }
                        });
                    }
                    else {
                        await prisma.innovator.update({
                            where: { userId: user.id },
                            data: {
                                institution,
                                highestEducation,
                                courseName,
                                courseStatus,
                                description,
                            }
                        });
                    }
                    break;
                case "MENTOR":
                    if (!user.mentor) {
                        await prisma.mentor.create({
                            data: {
                                userId: user.id,
                                mentorType: mentorType || "TECHNICAL_EXPERT",
                                organization,
                                role,
                                expertise,
                                description,
                            }
                        });
                    }
                    else {
                        await prisma.mentor.update({
                            where: { userId: user.id },
                            data: {
                                mentorType: mentorType || "TECHNICAL_EXPERT",
                                organization,
                                role,
                                expertise,
                                description,
                            }
                        });
                    }
                    break;
                case "FACULTY":
                    if (!user.faculty) {
                        await prisma.faculty.create({
                            data: {
                                userId: user.id,
                                institution,
                                role,
                                expertise,
                                course: courseName,
                                description,
                            }
                        });
                    }
                    else {
                        await prisma.faculty.update({
                            where: { userId: user.id },
                            data: {
                                institution,
                                role,
                                expertise,
                                course: courseName,
                                description,
                            }
                        });
                    }
                    break;
                case "OTHER":
                    if (!user.other) {
                        await prisma.other.create({
                            data: {
                                userId: user.id,
                                role,
                                workplace,
                                description,
                            }
                        });
                    }
                    else {
                        await prisma.other.update({
                            where: { userId: user.id },
                            data: {
                                role,
                                workplace,
                                description,
                            }
                        });
                    }
                    break;
            }
            // Fetch the complete updated user with all related records
            return prisma.user.findUnique({
                where: { id: user.id },
                include: {
                    innovator: true,
                    mentor: true,
                    faculty: true,
                    other: true,
                }
            });
        });
        // Check if updatedUser exists
        if (!updatedUser) {
            return res.status(404).json({ error: "Failed to update user profile" });
        }
        // Generate JWT token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("JWT_SECRET is not configured!");
            return res.status(500).json({ error: "Server configuration error" });
        }
        // Generate tokens
        const accessToken = jsonwebtoken_1.default.sign({ id: updatedUser.id, email: updatedUser.email, userRole: updatedUser.userRole }, jwtSecret, { expiresIn: "15m" });
        const refreshToken = jsonwebtoken_1.default.sign({ id: updatedUser.id, email: updatedUser.email, userRole: updatedUser.userRole }, jwtSecret, { expiresIn: "7d" });
        res.cookie("access_token", accessToken, getCookieOptions());
        res.cookie("refresh_token", refreshToken, getCookieOptions(true));
        // Prepare role-specific data for the response
        let roleSpecificData = {};
        if (updatedUser.userRole === "INNOVATOR" && updatedUser.innovator) {
            roleSpecificData = {
                institution: updatedUser.innovator.institution,
                highestEducation: updatedUser.innovator.highestEducation,
                courseName: updatedUser.innovator.courseName,
                courseStatus: updatedUser.innovator.courseStatus,
                description: updatedUser.innovator.description,
            };
        }
        else if (updatedUser.userRole === "MENTOR" && updatedUser.mentor) {
            roleSpecificData = {
                mentorType: updatedUser.mentor.mentorType,
                organization: updatedUser.mentor.organization,
                role: updatedUser.mentor.role,
                expertise: updatedUser.mentor.expertise,
                description: updatedUser.mentor.description,
            };
        }
        else if (updatedUser.userRole === "FACULTY" && updatedUser.faculty) {
            roleSpecificData = {
                institution: updatedUser.faculty.institution,
                role: updatedUser.faculty.role,
                expertise: updatedUser.faculty.expertise,
                course: updatedUser.faculty.course,
                mentoring: updatedUser.faculty.mentoring,
                description: updatedUser.faculty.description,
            };
        }
        else if (updatedUser.userRole === "OTHER" && updatedUser.other) {
            roleSpecificData = {
                role: updatedUser.other.role,
                workplace: updatedUser.other.workplace,
                description: updatedUser.other.description,
            };
        }
        // Return user info and token
        return res.status(200).json({
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                userRole: updatedUser.userRole,
                contactNumber: updatedUser.contactNumber,
                city: updatedUser.city,
                country: updatedUser.country,
                createdAt: updatedUser.createdAt,
                ...roleSpecificData,
            },
            message: "Profile completed successfully",
        });
    }
    catch (error) {
        console.error("Profile completion error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
