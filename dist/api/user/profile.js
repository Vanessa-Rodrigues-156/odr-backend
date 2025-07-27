"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfile = getUserProfile;
exports.updateUserProfile = updateUserProfile;
exports.default = profileHandler;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const auditLog_1 = require("../../lib/auditLog");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Helper: Remove script tags and dangerous characters
function sanitizeString(str) {
    return str.replace(/<script.*?>.*?<\/script>/gi, "").replace(/[<>]/g, "");
}
// Zod schema for user profile update
const profileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).transform((v) => sanitizeString(v)),
    imageAvatar: zod_1.z.string().url().max(300).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
    contactNumber: zod_1.z.string().min(5).max(20).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
    country: zod_1.z.string().max(100).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
    city: zod_1.z.string().max(100).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
    institution: zod_1.z.string().max(200).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
    organization: zod_1.z.string().max(200).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
    workplace: zod_1.z.string().max(200).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
    role: zod_1.z.string().max(100).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
    highestEducation: zod_1.z.string().max(100).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
    courseName: zod_1.z.string().max(100).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
    courseStatus: zod_1.z.string().max(100).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
    expertise: zod_1.z.string().max(200).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
    course: zod_1.z.string().max(100).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
    mentoring: zod_1.z.union([zod_1.z.boolean(), zod_1.z.string()]).optional().nullable(),
    description: zod_1.z.string().max(1000).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
});
// Rate limiter for profile update (20 requests per 10 minutes)
const formLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 20,
    message: { error: "Too many profile update attempts, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});
// GET /api/user/profile - Get current user profile
async function getUserProfile(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "User ID not found in request" });
        }
        const user = await prisma_1.default.user.findUnique({
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
    }
    catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
// PUT /api/user/profile - Update user profile
async function updateUserProfile(req, res) {
    let success = false;
    let message = '';
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "User ID not found in request" });
        }
        // Validate and sanitize input
        const parseResult = profileSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
        }
        const { name, imageAvatar, contactNumber, country, city, institution, organization, workplace, role, highestEducation, courseName, courseStatus, expertise, course, mentoring, description } = parseResult.data;
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
            }
            catch {
                return res.status(400).json({ error: "Please provide a valid image URL" });
            }
        }
        // Get user to check their role
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
        // Update user profile (base User table fields)
        const updateData = {
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
        const updatedUser = await prisma_1.default.user.update({
            where: { id: userId },
            data: updateData
        });
        success = true;
        message = 'Profile updated successfully';
        // Update role-specific data based on user's role
        if (existingUser.userRole === 'INNOVATOR') {
            if (existingUser.innovator) {
                const innovatorUpdateData = {};
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
                    await prisma_1.default.innovator.update({
                        where: { userId: userId },
                        data: innovatorUpdateData
                    });
                }
            }
            else {
                // Create innovator record if it doesn't exist
                await prisma_1.default.innovator.create({
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
        }
        else if (existingUser.userRole === 'MENTOR') {
            if (existingUser.mentor) {
                const mentorUpdateData = {};
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
                    await prisma_1.default.mentor.update({
                        where: { userId: userId },
                        data: mentorUpdateData
                    });
                }
            }
            else {
                // Create mentor record if it doesn't exist
                await prisma_1.default.mentor.create({
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
        }
        else if (existingUser.userRole === 'FACULTY') {
            if (existingUser.faculty) {
                const facultyUpdateData = {};
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
                    await prisma_1.default.faculty.update({
                        where: { userId: userId },
                        data: facultyUpdateData
                    });
                }
            }
            else {
                // Create faculty record if it doesn't exist
                await prisma_1.default.faculty.create({
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
        }
        else if (existingUser.userRole === 'OTHER') {
            if (existingUser.other) {
                const otherUpdateData = {};
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
                    await prisma_1.default.other.update({
                        where: { userId: userId },
                        data: otherUpdateData
                    });
                }
            }
            else {
                // Create other record if it doesn't exist
                await prisma_1.default.other.create({
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
        const finalUser = await prisma_1.default.user.findUnique({
            where: { id: userId },
            include: {
                innovator: true,
                mentor: true,
                faculty: true,
                other: true
            }
        });
        await (0, auditLog_1.logAuditEvent)({
            action: 'UPDATE_PROFILE',
            userId: userId,
            userRole: existingUser.userRole,
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
    }
    catch (error) {
        message = error instanceof Error ? error.message : String(error);
        await (0, auditLog_1.logAuditEvent)({
            action: 'UPDATE_PROFILE',
            userId: req.user?.id,
            userRole: undefined,
            targetId: req.user?.id,
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
async function profileHandler(req, res) {
    if (req.method === 'PUT') {
        // Apply rate limiter only for PUT (profile update)
        // @ts-ignore
        return formLimiter(req, res, () => updateUserProfile(req, res));
    }
    if (req.method === 'GET') {
        return getUserProfile(req, res);
    }
    else {
        res.setHeader('Allow', ['GET', 'PUT']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
}
