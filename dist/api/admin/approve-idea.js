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
                        userRole: true,
                        // Include role-specific tables for institution data
                        innovator: true,
                        faculty: true,
                        mentor: true,
                        other: true
                    }
                }
            },
            orderBy: { createdAt: "desc" },
        });
        // Map submissions to match the expected frontend format
        const formattedSubmissions = submissions.map((submission) => {
            // Get institution from the appropriate role-specific model
            let institution = null;
            if (submission.owner.userRole === "INNOVATOR" && submission.owner.innovator) {
                institution = submission.owner.innovator.institution;
            }
            else if (submission.owner.userRole === "FACULTY" && submission.owner.faculty) {
                institution = submission.owner.faculty.institution;
            }
            return {
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
                    institution: institution,
                    userType: institution ? "student" : "professional" // Inferred from data
                }
            };
        });
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
        console.log(`[Admin] Processing approval for idea: ${ideaId}`);
        // Use a transaction to ensure consistency
        const result = await prisma_1.default.$transaction(async (tx) => {
            // Get the submission
            const submission = await tx.ideaSubmission.findUnique({
                where: { id: ideaId },
                include: { owner: true }
            });
            if (!submission) {
                throw new Error(`Idea submission with ID ${ideaId} not found`);
            }
            if (submission.reviewed) {
                throw new Error(`Idea with ID ${ideaId} has already been reviewed`);
            }
            // Validate required fields
            if (!submission.title) {
                throw new Error("Submission title is required");
            }
            // Create a new Idea from the submission data
            const idea = await tx.idea.create({
                data: {
                    title: submission.title,
                    caption: submission.caption || "", // Provide fallback for nullable fields
                    description: submission.description || "",
                    approved: true,
                    ownerId: submission.ownerId,
                }
            });
            // Mark the submission as reviewed and approved
            const updatedSubmission = await tx.ideaSubmission.update({
                where: { id: ideaId },
                data: {
                    reviewed: true,
                    approved: true,
                    reviewedAt: new Date(),
                    reviewedBy: req.user?.id || null // Handle null case
                }
            });
            return { idea, updatedSubmission };
        });
        console.log(`[Admin] Successfully approved idea: ${ideaId}`);
        res.status(201).json({
            success: true,
            idea: result.idea
        });
    }
    catch (error) {
        // Better error handling
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[Admin] Error approving idea: ${errorMessage}`);
        console.error(error); // Log the full error object for debugging
        // Determine appropriate status code based on error
        let statusCode = 500;
        if (errorMessage.includes("not found")) {
            statusCode = 404;
        }
        else if (errorMessage.includes("already been reviewed")) {
            statusCode = 400;
        }
        res.status(statusCode).json({
            error: "Failed to approve idea",
            details: errorMessage
        });
    }
});
exports.default = router;
