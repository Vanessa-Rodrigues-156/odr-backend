"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticateJWT);
function requireAdmin(req, res, next) {
    if (req.user?.userRole !== "ADMIN") {
        return res.status(403).json({ error: "Admin access required" });
    }
    next();
}
// List all users (no password)
router.get("/", requireAdmin, async (req, res) => {
    // Get base user data
    const users = await prisma_1.default.user.findMany({
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
        }
        else if (user.userRole === "MENTOR" && user.mentor) {
            typeSpecificData = {
                institution: user.mentor.organization,
                odrLabUsage: user.mentor.description,
                mentorType: user.mentor.mentorType,
                role: user.mentor.role,
                expertise: user.mentor.expertise,
            };
        }
        else if (user.userRole === "FACULTY" && user.faculty) {
            typeSpecificData = {
                institution: user.faculty.institution,
                odrLabUsage: user.faculty.description,
                role: user.faculty.role,
                expertise: user.faculty.expertise,
                course: user.faculty.course,
                mentoring: user.faculty.mentoring,
            };
        }
        else if (user.other) {
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
router.get("/:id", requireAdmin, async (req, res) => {
    const user = await prisma_1.default.user.findUnique({
        where: { id: req.params.id },
        include: {
            innovator: true,
            mentor: true,
            faculty: true,
            other: true,
        },
    });
    if (!user)
        return res.status(404).json({ error: "User not found" });
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
    }
    else if (user.userRole === "MENTOR" && user.mentor) {
        typeSpecificData = {
            institution: user.mentor.organization,
            odrLabUsage: user.mentor.description,
            mentorType: user.mentor.mentorType,
            role: user.mentor.role,
            expertise: user.mentor.expertise,
        };
    }
    else if (user.userRole === "FACULTY" && user.faculty) {
        typeSpecificData = {
            institution: user.faculty.institution,
            odrLabUsage: user.faculty.description,
            role: user.faculty.role,
            expertise: user.faculty.expertise,
            course: user.faculty.course,
            mentoring: user.faculty.mentoring,
        };
    }
    else if (user.other) {
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
router.put("/:id", requireAdmin, async (req, res) => {
    const { name, userRole, contactNumber, city, country, institution, highestEducation, odrLabUsage, mentorType, organization, role, expertise, workplace, courseName, courseStatus, course, mentoring } = req.body;
    const userId = req.params.id;
    // Get the user to determine their current role
    const existingUser = await prisma_1.default.user.findUnique({
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
    const result = await prisma_1.default.$transaction(async (prismaClient) => {
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
        }
        else if (targetUserRole === "MENTOR") {
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
        }
        else if (targetUserRole === "FACULTY") {
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
        }
        else if (targetUserRole === "OTHER") {
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
    const updatedUserWithRelatedData = await prisma_1.default.user.findUnique({
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
router.delete("/:id", requireAdmin, async (req, res) => {
    const userId = req.params.id;
    try {
        console.log(`[Admin] Attempting to delete user with ID: ${userId}`);
        // Use a transaction to ensure all operations succeed or fail together
        await prisma_1.default.$transaction(async (tx) => {
            // First check if the user exists
            const userExists = await tx.user.findUnique({
                where: { id: userId },
                select: { id: true }
            });
            if (!userExists) {
                throw new Error(`User with ID ${userId} not found`);
            }
            // Handle ideas owned by this user - either reassign or delete them
            const userIdeas = await tx.idea.findMany({
                where: { ownerId: userId },
                select: { id: true }
            });
            if (userIdeas.length > 0) {
                console.log(`[Admin] Found ${userIdeas.length} ideas owned by user ${userId}. Deleting these first.`);
                // Delete all ideas owned by the user
                await tx.idea.deleteMany({
                    where: { ownerId: userId }
                });
            }
            // Handle idea submissions by this user
            await tx.ideaSubmission.deleteMany({
                where: { ownerId: userId }
            });
            // Now that related records are handled, delete the user
            await tx.user.delete({
                where: { id: userId }
            });
        });
        console.log(`[Admin] Successfully deleted user with ID: ${userId}`);
        res.json({ success: true });
    }
    catch (error) {
        console.error(`[Admin] Error deleting user:`, error);
        // Provide better error messages for specific error cases
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: error.message });
            }
            // Check for foreign key constraint errors
            if ('code' in error && error.code === 'P2003') {
                return res.status(400).json({
                    error: "Cannot delete user because they have associated records. Try reassigning or deleting those records first.",
                    details: error.message
                });
            }
        }
        res.status(500).json({
            error: "Failed to delete user",
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
// Get user by email (for testing password)
router.get("/email/:email", async (req, res) => {
    const { email } = req.params;
    const user = await prisma_1.default.user.findUnique({
        where: { email },
        include: {
            innovator: true,
            mentor: true,
            faculty: true,
            other: true,
        },
    });
    if (!user)
        return res.status(404).json({ error: "User not found" });
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
    }
    else if (user.userRole === "MENTOR" && user.mentor) {
        typeSpecificData = {
            institution: user.mentor.organization,
            odrLabUsage: user.mentor.description,
            mentorType: user.mentor.mentorType,
            role: user.mentor.role,
            expertise: user.mentor.expertise,
        };
    }
    else if (user.userRole === "FACULTY" && user.faculty) {
        typeSpecificData = {
            institution: user.faculty.institution,
            odrLabUsage: user.faculty.description,
            role: user.faculty.role,
            expertise: user.faculty.expertise,
            course: user.faculty.course,
            mentoring: user.faculty.mentoring,
        };
    }
    else if (user.other) {
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
exports.default = router;
