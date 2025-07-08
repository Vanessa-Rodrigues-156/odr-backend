"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// Apply base JWT authentication to all routes
router.use(auth_1.authenticateJWT);
// Helper: Remove script tags and dangerous characters
function sanitizeString(str) {
    return str.replace(/<script.*?>.*?<\/script>/gi, "").replace(/[<>]/g, "");
}
// MentorType enum as per Prisma schema
const MentorTypeEnum = zod_1.z.enum([
    "TECHNICAL_EXPERT",
    "LEGAL_EXPERT",
    "ODR_EXPERT",
    "CONFLICT_RESOLUTION_EXPERT"
]);
// Zod schema for mentor registration (fields as per Prisma schema)
const mentorRegistrationSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).transform((v) => sanitizeString(v)),
    email: zod_1.z.string().email().max(200).transform((v) => sanitizeString(v)),
    contactNumber: zod_1.z.string().min(5).max(20).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
    city: zod_1.z.string().max(100).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
    country: zod_1.z.string().max(100).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
    mentorType: MentorTypeEnum,
    organization: zod_1.z.string().max(200).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
    role: zod_1.z.string().max(100).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
    expertise: zod_1.z.string().max(200).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
    description: zod_1.z.string().max(1000).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
});
// Example POST /api/mentors/register (add this if not present)
router.post("/register", async (req, res) => {
    const parseResult = mentorRegistrationSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
    }
    const { name, email, contactNumber, city, country, mentorType, organization, role, expertise, description } = parseResult.data;
    try {
        // Create mentor user and mentor profile as per schema
        const user = await prisma_1.default.user.create({
            data: {
                name,
                email,
                contactNumber,
                city,
                country,
                userRole: "MENTOR",
                mentor: {
                    create: {
                        mentorType,
                        organization,
                        role,
                        expertise,
                        description,
                        approved: false
                    }
                }
            },
            include: { mentor: true }
        });
        res.status(201).json(user);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to register mentor", details: error instanceof Error ? error.message : "Unknown error" });
    }
});
// Get all mentors
router.get("/", async (req, res) => {
    try {
        const mentors = await prisma_1.default.user.findMany({
            where: {
                userRole: "MENTOR"
            },
            select: {
                id: true,
                name: true,
                email: true,
                contactNumber: true,
                city: true,
                country: true,
                createdAt: true,
                // Include the mentor-specific data
                mentor: {
                    select: {
                        mentorType: true,
                        organization: true,
                        role: true,
                        expertise: true,
                        description: true,
                        approved: true,
                    }
                },
                // Get ideas where this user is a mentor using ideaMentors relation
                ideaMentors: {
                    include: {
                        idea: {
                            select: {
                                id: true,
                                title: true,
                                caption: true,
                                description: true,
                                createdAt: true,
                            }
                        }
                    }
                }
            }
        });
        // Process the data to flatten it and make it more convenient for frontend use
        const processedMentors = mentors.map(mentor => {
            // Extract the mentor-specific data - ensure it's always an object even if null
            const mentorSpecificData = mentor.mentor || {
                mentorType: null,
                organization: null,
                role: null,
                expertise: null,
                description: null,
                approved: false
            };
            // Extract the ideas this user mentors - with safer handling
            const mentoringIdeas = Array.isArray(mentor.ideaMentors)
                ? mentor.ideaMentors.map(relationship => ({
                    role: relationship.role || 'Mentor',
                    idea: relationship.idea
                }))
                : [];
            // Return flattened structure
            return {
                id: mentor.id,
                name: mentor.name || 'Unnamed Mentor',
                email: mentor.email || '',
                contactNumber: mentor.contactNumber || '',
                city: mentor.city || '',
                country: mentor.country || '',
                createdAt: mentor.createdAt,
                // Add mentor-specific fields with defaults
                mentorType: mentorSpecificData.mentorType || null,
                organization: mentorSpecificData.organization || null,
                institution: mentorSpecificData.organization || null, // Added for frontend compatibility
                role: mentorSpecificData.role || null,
                expertise: mentorSpecificData.expertise || null,
                description: mentorSpecificData.description || null,
                approved: mentorSpecificData.approved || false, // Include approval status
                // Add mentored ideas
                mentoringIdeas
            };
        });
        res.json({ mentors: processedMentors });
    }
    catch (error) {
        console.error("Error fetching mentors:", error);
        res.status(500).json({ error: "Failed to fetch mentors", details: error instanceof Error ? error.message : "Unknown error" });
    }
});
// Get specific mentor by ID with their ideas
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const mentor = await prisma_1.default.user.findUnique({
            where: { id, userRole: "MENTOR" },
            select: {
                id: true,
                name: true,
                email: true,
                contactNumber: true,
                city: true,
                country: true,
                createdAt: true,
                // Include the mentor-specific data with all fields
                mentor: {
                    select: {
                        mentorType: true,
                        organization: true,
                        role: true,
                        expertise: true,
                        description: true,
                        approved: true,
                        reviewedAt: true
                    }
                },
                // Get ideas where this user is a mentor
                ideaMentors: {
                    include: {
                        idea: {
                            select: {
                                id: true,
                                title: true,
                                caption: true,
                                description: true,
                                createdAt: true,
                            }
                        }
                    }
                }
            }
        });
        if (!mentor) {
            return res.status(404).json({ error: "Mentor not found" });
        }
        // Process data to flatten the structure with better null handling
        const mentorData = {
            id: mentor.id,
            name: mentor.name || 'Unnamed Mentor',
            email: mentor.email || '',
            contactNumber: mentor.contactNumber || '',
            city: mentor.city || '',
            country: mentor.country || '',
            createdAt: mentor.createdAt,
            // Add mentor-specific fields with null safety
            mentorType: mentor.mentor?.mentorType || null,
            organization: mentor.mentor?.organization || null,
            institution: mentor.mentor?.organization || null, // Added for frontend compatibility
            role: mentor.mentor?.role || null,
            expertise: mentor.mentor?.expertise || null,
            description: mentor.mentor?.description || null,
            approved: mentor.mentor?.approved || false,
            // Add mentored ideas with safety checks
            mentoringIdeas: Array.isArray(mentor.ideaMentors)
                ? mentor.ideaMentors.map(relationship => ({
                    role: relationship.role || 'Mentor',
                    idea: relationship.idea
                }))
                : []
        };
        res.json(mentorData);
    }
    catch (error) {
        console.error("Error fetching mentor:", error);
        res.status(500).json({ error: "Failed to fetch mentor", details: error instanceof Error ? error.message : "Unknown error" });
    }
});
exports.default = router;
