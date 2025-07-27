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
const auditLog_1 = require("../../lib/auditLog");
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
    const { ideaId } = req.body;
    if (!ideaId)
        return res.status(400).json({ error: "ideaId required" });
    let success = false;
    let message = '';
    try {
        // Check if this is an ideaSubmission first
        const submission = await prisma_1.default.ideaSubmission.findUnique({
            where: { id: ideaId },
        });
        if (submission) {
            const idea = await prisma_1.default.idea.create({
                data: {
                    title: submission.title,
                    caption: submission.caption,
                    description: submission.description,
                    approved: true,
                    ownerId: submission.ownerId,
                }
            });
            await prisma_1.default.ideaSubmission.update({
                where: { id: ideaId },
                data: {
                    reviewed: true,
                    approved: true,
                    reviewedAt: new Date(),
                    reviewedBy: req.user?.id,
                }
            });
            success = true;
            message = 'Idea submission approved and idea created.';
            await (0, auditLog_1.logAuditEvent)({
                action: 'APPROVE_IDEA',
                userId: req.user?.id,
                userRole: req.user?.userRole,
                targetId: ideaId,
                targetType: 'IDEA_SUBMISSION',
                success,
                message,
                ipAddress: req.ip,
            });
            return res.json({ success: true, idea });
        }
        const existingIdea = await prisma_1.default.idea.findUnique({
            where: { id: ideaId },
        });
        if (!existingIdea) {
            message = 'Idea not found. The ID may be invalid or the submission may have been deleted.';
            await (0, auditLog_1.logAuditEvent)({
                action: 'APPROVE_IDEA',
                userId: req.user?.id,
                userRole: req.user?.userRole,
                targetId: ideaId,
                targetType: 'IDEA',
                success: false,
                message,
                ipAddress: req.ip,
            });
            return res.status(404).json({ error: message });
        }
        await prisma_1.default.idea.update({
            where: { id: ideaId },
            data: { approved: true }
        });
        success = true;
        message = 'Existing idea approved.';
        await (0, auditLog_1.logAuditEvent)({
            action: 'APPROVE_IDEA',
            userId: req.user?.id,
            userRole: req.user?.userRole,
            targetId: ideaId,
            targetType: 'IDEA',
            success,
            message,
            ipAddress: req.ip,
        });
        res.json({ success: true });
    }
    catch (error) {
        message = error instanceof Error ? error.message : String(error);
        await (0, auditLog_1.logAuditEvent)({
            action: 'APPROVE_IDEA',
            userId: req.user?.id,
            userRole: req.user?.userRole,
            targetId: ideaId,
            targetType: 'IDEA',
            success: false,
            message,
            ipAddress: req.ip,
        });
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2022') {
            const prismaError = error;
            return res.status(500).json({
                error: `Database schema mismatch: Column '${prismaError.meta?.column}' in model '${prismaError.meta?.modelName}' doesn't exist in the database. Run prisma migrate to update your database.`,
                details: prismaError.message
            });
        }
        res.status(500).json({ error: "Failed to approve idea. Please try again.", details: message });
    }
});
// Reject (delete) an idea
router.post("/reject-idea", requireAdmin, async (req, res) => {
    const { ideaId } = req.body;
    if (!ideaId)
        return res.status(400).json({ error: "ideaId required" });
    let success = false;
    let message = '';
    try {
        const submission = await prisma_1.default.ideaSubmission.findUnique({
            where: { id: ideaId },
        });
        if (submission) {
            await prisma_1.default.ideaSubmission.update({
                where: { id: ideaId },
                data: {
                    reviewed: true,
                    approved: false,
                    reviewedAt: new Date(),
                    reviewedBy: req.user?.id,
                }
            });
            success = true;
            message = 'Idea submission rejected.';
            await (0, auditLog_1.logAuditEvent)({
                action: 'REJECT_IDEA',
                userId: req.user?.id,
                userRole: req.user?.userRole,
                targetId: ideaId,
                targetType: 'IDEA_SUBMISSION',
                success,
                message,
                ipAddress: req.ip,
            });
            return res.json({ success: true });
        }
        await prisma_1.default.idea.delete({ where: { id: ideaId } });
        success = true;
        message = 'Idea deleted.';
        await (0, auditLog_1.logAuditEvent)({
            action: 'REJECT_IDEA',
            userId: req.user?.id,
            userRole: req.user?.userRole,
            targetId: ideaId,
            targetType: 'IDEA',
            success,
            message,
            ipAddress: req.ip,
        });
        res.json({ success: true });
    }
    catch (error) {
        message = error instanceof Error ? error.message : String(error);
        await (0, auditLog_1.logAuditEvent)({
            action: 'REJECT_IDEA',
            userId: req.user?.id,
            userRole: req.user?.userRole,
            targetId: ideaId,
            targetType: 'IDEA',
            success: false,
            message,
            ipAddress: req.ip,
        });
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
