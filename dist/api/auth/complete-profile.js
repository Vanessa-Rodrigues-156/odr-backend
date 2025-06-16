"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = completeProfileHandler;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
async function completeProfileHandler(req, res) {
    try {
        const { userId, email, name, contactNumber, city, country, userType, institution, highestEducation, 
        // odrLabUsage, <- Remove this field as it doesn't exist in the schema
        // Additional fields for role-specific profiles
        mentorType, organization, expertise, role, courseName, courseStatus, description, workplace } = req.body;
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
        const userRole = userRoleMap[userType] || "INNOVATOR";
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
        const token = jsonwebtoken_1.default.sign({ id: updatedUser.id, email: updatedUser.email, userRole: updatedUser.userRole }, jwtSecret, { expiresIn: "7d" });
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
            token,
            message: "Profile completed successfully",
        });
    }
    catch (error) {
        console.error("Profile completion error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
