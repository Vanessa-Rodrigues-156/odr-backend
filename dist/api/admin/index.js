"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const users_1 = __importDefault(require("./users"));
const analytics_1 = __importDefault(require("./analytics"));
const approve_idea_1 = __importDefault(require("./approve-idea"));
const approve_mentor_1 = __importDefault(require("./approve-mentor"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticateJWT);
// Middleware to check for ADMIN role
function requireAdmin(req, res, next) {
    if (req.user?.userRole !== "ADMIN") {
        return res.status(403).json({ error: "Admin access required" });
    }
    next();
}
// List all ideas pending approval
router.get("/ideas/pending", requireAdmin, async (req, res) => {
    const ideas = await prisma_1.default.idea.findMany({
        where: { approved: false },
        include: { owner: true },
        orderBy: { createdAt: "desc" },
    });
    res.json(ideas);
});
// Approve an idea
router.post("/approve-idea", requireAdmin, async (req, res) => {
    try {
        const { ideaId } = req.body;
        if (!ideaId)
            return res.status(400).json({ error: "ideaId required" });
        // Check if this is an ideaSubmission first
        const submission = await prisma_1.default.ideaSubmission.findUnique({
            where: { id: ideaId },
        });
        if (submission) {
            // This is a submission that needs to be converted to an idea
            // Only explicitly include fields that we know exist in the database
            const idea = await prisma_1.default.idea.create({
                data: {
                    title: submission.title,
                    caption: submission.caption,
                    description: submission.description,
                    approved: true,
                    ownerId: submission.ownerId,
                    // Note: don't include 'featured' as it may not exist in the database yet
                }
            });
            // Update the submission to mark it as reviewed and approved
            await prisma_1.default.ideaSubmission.update({
                where: { id: ideaId },
                data: {
                    reviewed: true,
                    approved: true,
                    reviewedAt: new Date(),
                    reviewedBy: req.user?.id,
                }
            });
            return res.json({ success: true, idea });
        }
        // If it's not a submission, check if it's an existing idea
        const existingIdea = await prisma_1.default.idea.findUnique({
            where: { id: ideaId },
        });
        if (!existingIdea) {
            return res.status(404).json({
                error: "Idea not found. The ID may be invalid or the submission may have been deleted."
            });
        }
        // If it is an existing idea, update its approved status
        await prisma_1.default.idea.update({
            where: { id: ideaId },
            data: { approved: true }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error approving idea:", error);
        // Provide more specific error message for schema mismatches
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2022') {
            const prismaError = error;
            return res.status(500).json({
                error: `Database schema mismatch: Column '${prismaError.meta?.column}' in model '${prismaError.meta?.modelName}' doesn't exist in the database. Run prisma migrate to update your database.`,
                details: prismaError.message
            });
        }
        res.status(500).json({ error: "Failed to approve idea. Please try again.", details: error instanceof Error ? error.message : String(error) });
    }
});
// Reject (delete) an idea
router.post("/reject-idea", requireAdmin, async (req, res) => {
    const { ideaId } = req.body;
    if (!ideaId)
        return res.status(400).json({ error: "ideaId required" });
    try {
        // Check if this is a submission first
        const submission = await prisma_1.default.ideaSubmission.findUnique({
            where: { id: ideaId },
        });
        if (submission) {
            // Update the submission to mark it as reviewed but not approved
            await prisma_1.default.ideaSubmission.update({
                where: { id: ideaId },
                data: {
                    reviewed: true,
                    approved: false,
                    reviewedAt: new Date(),
                    reviewedBy: req.user?.id,
                }
            });
            return res.json({ success: true });
        }
        // If not a submission, try to delete the idea
        await prisma_1.default.idea.delete({ where: { id: ideaId } });
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error rejecting idea:", error);
        res.status(500).json({ error: "Failed to reject idea. Please try again." });
    }
});
// Mount all routes
router.use("/users", users_1.default);
router.use("/analytics", analytics_1.default);
router.use("/approve-idea", approve_idea_1.default);
// Debug logging for approveMentorRoutes
console.log("[Setup] Mounting approveMentorRoutes at /approve-mentor");
router.use("/approve-mentor", approve_mentor_1.default);
exports.default = router;
