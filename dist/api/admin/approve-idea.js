"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateJWT);
// Middleware to check if user is an admin
const ensureAdmin = (req, res, next) => {
    if (req.user && req.user.userRole === "ADMIN") {
        next();
    }
    else {
        return res.status(403).json({ error: "Admin access required" });
    }
};
// Use admin middleware for all routes
router.use(ensureAdmin);
// GET - List all idea submissions for admin approval
router.get("/", async (req, res) => {
    try {
        const submissions = await prisma_1.default.ideaSubmission.findMany({
            where: { reviewed: false },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        country: true,
                        institution: true,
                    }
                }
            },
            orderBy: { createdAt: "desc" },
        });
        // Map submissions to match the expected frontend format
        const formattedSubmissions = submissions.map((submission) => ({
            id: submission.id,
            title: submission.title,
            ideaCaption: submission.caption || "",
            description: submission.description,
            odrExperience: submission.priorOdrExperience || "",
            consent: true, // Assuming consent is implied in your system
            approved: false, // Not approved yet
            createdAt: submission.createdAt.toISOString(),
            userId: submission.ownerId,
            user: {
                id: submission.owner.id,
                name: submission.owner.name,
                email: submission.owner.email,
                country: submission.owner.country,
                institution: submission.owner.institution,
                userType: submission.owner.institution ? "student" : "professional" // Inferred from data
            }
        }));
        res.json(formattedSubmissions);
    }
    catch (error) {
        console.error("[Admin] Error fetching idea submissions:", error);
        res.status(500).json({ error: "Failed to fetch idea submissions" });
    }
});
// POST - Approve a submission and create an Idea from it
router.post("/", async (req, res) => {
    try {
        const { ideaId } = req.body;
        if (!ideaId) {
            return res.status(400).json({ error: "Idea ID is required" });
        }
        // Get the submission
        const submission = await prisma_1.default.ideaSubmission.findUnique({
            where: { id: ideaId },
            include: { owner: true }
        });
        if (!submission) {
            return res.status(404).json({ error: "Idea submission not found" });
        }
        if (submission.reviewed) {
            return res.status(400).json({ error: "Idea has already been reviewed" });
        }
        // Create a new Idea from the submission data
        const idea = await prisma_1.default.idea.create({
            data: {
                title: submission.title,
                caption: submission.caption,
                description: submission.description,
                priorOdrExperience: submission.priorOdrExperience,
                approved: true,
                reviewedAt: new Date(),
                reviewedBy: req.user?.id, // Safe access with optional chaining
                ownerId: submission.ownerId,
            }
        });
        // Mark the submission as reviewed and approved
        await prisma_1.default.ideaSubmission.update({
            where: { id: ideaId },
            data: {
                reviewed: true,
                approved: true,
                reviewedAt: new Date(),
                reviewedBy: req.user?.id // Safe access with optional chaining
            }
        });
        res.status(201).json({
            success: true,
            idea
        });
    }
    catch (error) {
        console.error("[Admin] Error approving idea:", error);
        res.status(500).json({ error: "Failed to approve idea" });
    }
});
exports.default = router;
