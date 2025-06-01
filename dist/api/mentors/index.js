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
                institution: true,
                highestEducation: true,
                odrLabUsage: true,
                createdAt: true,
                mentoringIdeas: {
                    include: {
                        idea: {
                            select: {
                                id: true,
                                title: true,
                                caption: true,
                                description: true,
                                createdAt: true,
                                views: true
                            }
                        }
                    }
                }
            }
        });
        res.json({ mentors });
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
                institution: true,
                highestEducation: true,
                odrLabUsage: true,
                createdAt: true,
                mentoringIdeas: {
                    include: {
                        idea: {
                            select: {
                                id: true,
                                title: true,
                                caption: true,
                                description: true,
                                createdAt: true,
                                views: true
                            }
                        }
                    }
                }
            }
        });
        if (!mentor) {
            return res.status(404).json({ error: "Mentor not found" });
        }
        res.json(mentor);
    }
    catch (error) {
        console.error("Error fetching mentor:", error);
        res.status(500).json({ error: "Failed to fetch mentor" });
    }
});
exports.default = router;
