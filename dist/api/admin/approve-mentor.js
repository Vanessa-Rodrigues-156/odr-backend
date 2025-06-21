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
// GET - List all pending mentor approvals
router.get("/", async (req, res) => {
    try {
        console.log("[Admin] Fetching pending mentors for approval");
        const pendingMentors = await prisma_1.default.user.findMany({
            where: {
                mentor: {
                    approved: false
                }
            },
            include: {
                mentor: true
            },
            orderBy: { createdAt: "desc" },
        });
        // Format mentors to exactly match the frontend's expected structure
        const formattedMentors = pendingMentors.map(user => {
            const { password, ...userWithoutPassword } = user;
            return {
                ...userWithoutPassword,
                // Return mentor data in the exact format expected by frontend
                mentor: {
                    id: user.mentor?.id || "",
                    organization: user.mentor?.organization || undefined,
                    mentorType: user.mentor?.mentorType || "",
                    role: user.mentor?.role || undefined,
                    expertise: user.mentor?.expertise || undefined,
                    description: user.mentor?.description || undefined
                }
            };
        });
        console.log(`[Admin] Found ${formattedMentors.length} pending mentors`);
        res.json(formattedMentors);
    }
    catch (error) {
        console.error("[Admin] Error fetching pending mentors:", error);
        res.status(500).json({ error: "Failed to fetch pending mentors" });
    }
});
// POST - Approve a mentor
router.post("/", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }
        console.log(`[Admin] Processing approval for mentor: ${userId}`);
        // Use a transaction to ensure consistency
        const result = await prisma_1.default.$transaction(async (tx) => {
            // Find the user who has applied for mentor status
            const user = await tx.user.findUnique({
                where: {
                    id: userId
                },
                include: { mentor: true }
            });
            if (!user) {
                throw new Error(`User with ID ${userId} not found or is not a mentor`);
            }
            if (!user.mentor) {
                throw new Error(`Mentor data not found for user ${userId}`);
            }
            if (user.mentor.approved) {
                throw new Error(`Mentor with ID ${userId} is already approved`);
            }
            // Approve the mentor
            const updatedMentor = await tx.mentor.update({
                where: { userId: userId },
                data: {
                    approved: true,
                    reviewedAt: new Date(),
                    reviewedBy: req.user?.id,
                }
            });
            // Change user role from OTHER to MENTOR
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    userRole: "MENTOR" // Promote to MENTOR role
                }
            });
            // Remove entry from "other" table as they're now a mentor
            await tx.other.deleteMany({
                where: { userId: userId }
            }).catch(err => {
                console.warn("Could not delete from 'other' table", err);
                // Continue with the process even if this fails
            });
            return { user: updatedUser, mentor: updatedMentor };
        });
        console.log(`[Admin] Successfully approved mentor: ${userId}`);
        res.status(200).json({
            success: true,
            user: {
                ...result.user,
                mentor: result.mentor
            }
        });
    }
    catch (error) {
        // Error handling
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[Admin] Error approving mentor: ${errorMessage}`);
        console.error(error);
        // Determine appropriate status code
        let statusCode = 500;
        if (errorMessage.includes("not found")) {
            statusCode = 404;
        }
        else if (errorMessage.includes("already approved")) {
            statusCode = 400;
        }
        res.status(statusCode).json({
            error: "Failed to approve mentor",
            details: errorMessage
        });
    }
});
// POST - Reject a mentor
router.post("/reject", async (req, res) => {
    try {
        const { userId, reason } = req.body;
        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }
        console.log(`[Admin] Processing rejection for mentor: ${userId}, reason: ${reason || 'Not provided'}`);
        // Use a transaction for consistency
        const result = await prisma_1.default.$transaction(async (tx) => {
            // Find the user
            const user = await tx.user.findUnique({
                where: {
                    id: userId,
                    userRole: "MENTOR"
                },
                include: { mentor: true }
            });
            if (!user) {
                throw new Error(`User with ID ${userId} not found or is not a mentor`);
            }
            if (!user.mentor) {
                throw new Error(`Mentor data not found for user ${userId}`);
            }
            // Mark as rejected
            const updatedMentor = await tx.mentor.update({
                where: { userId: userId },
                data: {
                    approved: false,
                    rejectionReason: reason || "Application not approved",
                    reviewedAt: new Date(),
                    reviewedBy: req.user?.id,
                }
            });
            // Change user role from MENTOR to OTHER
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    userRole: "OTHER" // Demote to OTHER role
                }
            });
            // Create entry in "other" table with mentor data to preserve information
            // Check if entry exists first
            const existingOther = await tx.other.findUnique({
                where: { userId: userId }
            });
            // Only create if doesn't exist
            if (!existingOther) {
                await tx.other.create({
                    data: {
                        userId: userId,
                        role: user.mentor.mentorType ? `Former ${user.mentor.mentorType} mentor applicant` : "Former mentor applicant",
                        workplace: user.mentor.organization || "",
                        description: `Mentor application rejected: ${reason || "No reason provided"}`
                    }
                });
            }
            return { user: updatedUser, mentor: updatedMentor };
        });
        console.log(`[Admin] Successfully rejected mentor: ${userId} and changed role to OTHER`);
        res.status(200).json({
            success: true,
            message: "Mentor application has been rejected and user role updated"
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[Admin] Error rejecting mentor: ${errorMessage}`);
        let statusCode = 500;
        if (errorMessage.includes("not found")) {
            statusCode = 404;
        }
        res.status(statusCode).json({
            error: "Failed to reject mentor",
            details: errorMessage
        });
    }
});
exports.default = router;
