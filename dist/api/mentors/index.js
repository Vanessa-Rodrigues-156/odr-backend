"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// Apply base JWT authentication to all routes
router.use(auth_1.authenticateJWT);
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
            // Extract the mentor-specific data
            const mentorSpecificData = mentor.mentor || {};
            // Extract the ideas this user mentors
            const mentoringIdeas = mentor.ideaMentors.map(relationship => ({
                role: relationship.role,
                idea: relationship.idea
            }));
            // Return flattened structure
            return {
                id: mentor.id,
                name: mentor.name,
                email: mentor.email,
                contactNumber: mentor.contactNumber,
                city: mentor.city,
                country: mentor.country,
                createdAt: mentor.createdAt,
                // Add mentor-specific fields
                ...mentorSpecificData,
                // Add mentored ideas
                mentoringIdeas
            };
        });
        res.json({ mentors: processedMentors });
    }
    catch (error) {
        console.error("Error fetching mentors:", error);
        res.status(500).json({ error: "Failed to fetch mentors" });
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
                // Include the mentor-specific data
                mentor: true,
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
        // Process data to flatten the structure
        const mentorData = {
            id: mentor.id,
            name: mentor.name,
            email: mentor.email,
            contactNumber: mentor.contactNumber,
            city: mentor.city,
            country: mentor.country,
            createdAt: mentor.createdAt,
            // Add mentor-specific fields
            mentorType: mentor.mentor?.mentorType,
            organization: mentor.mentor?.organization,
            role: mentor.mentor?.role,
            expertise: mentor.mentor?.expertise,
            description: mentor.mentor?.description,
            // Add mentored ideas
            mentoringIdeas: mentor.ideaMentors.map(relationship => ({
                role: relationship.role,
                idea: relationship.idea
            }))
        };
        res.json(mentorData);
    }
    catch (error) {
        console.error("Error fetching mentor:", error);
        res.status(500).json({ error: "Failed to fetch mentor" });
    }
});
exports.default = router;
