import { Router, Response, NextFunction } from "express";
import { authenticateJWT, AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import usersRoutes from "./users";
import analyticsRoutes from "./analytics";
import approveIdeaRoutes from "./approve-idea";
import approveMentorRoutes from "./approve-mentor";
import { logAuditEvent } from "../../lib/auditLog";

const router = Router();
router.use(authenticateJWT);

// Middleware to check for ADMIN role
function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.userRole !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// List all ideas pending approval
router.get("/ideas/pending", requireAdmin, async (req, res) => {
  const ideas = await prisma.idea.findMany({
    where: { approved: false },
    include: { owner: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(ideas);
});

// Approve an idea
router.post("/approve-idea", requireAdmin, async (req: AuthRequest, res) => {
  const { ideaId } = req.body;
  if (!ideaId) return res.status(400).json({ error: "ideaId required" });
  let success = false;
  let message = '';
  try {
    // Check if this is an ideaSubmission first
    const submission = await prisma.ideaSubmission.findUnique({
      where: { id: ideaId },
    });

    if (submission) {
      const idea = await prisma.idea.create({
        data: {
          title: submission.title,
          caption: submission.caption,
          description: submission.description,
          approved: true,
          ownerId: submission.ownerId,
        }
      });
      await prisma.ideaSubmission.update({
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
      await logAuditEvent({
        action: 'APPROVE_IDEA',
        userId: req.user?.id,
        userRole: req.user?.userRole as any,
        targetId: ideaId,
        targetType: 'IDEA_SUBMISSION',
        success,
        message,
        ipAddress: req.ip,
      });
      return res.json({ success: true, idea });
    }

    const existingIdea = await prisma.idea.findUnique({
      where: { id: ideaId },
    });
    if (!existingIdea) {
      message = 'Idea not found. The ID may be invalid or the submission may have been deleted.';
      await logAuditEvent({
        action: 'APPROVE_IDEA',
        userId: req.user?.id,
        userRole: req.user?.userRole as any,
        targetId: ideaId,
        targetType: 'IDEA',
        success: false,
        message,
        ipAddress: req.ip,
      });
      return res.status(404).json({ error: message });
    }
    await prisma.idea.update({ 
      where: { id: ideaId }, 
      data: { approved: true } 
    });
    success = true;
    message = 'Existing idea approved.';
    await logAuditEvent({
      action: 'APPROVE_IDEA',
      userId: req.user?.id,
      userRole: req.user?.userRole as any,
      targetId: ideaId,
      targetType: 'IDEA',
      success,
      message,
      ipAddress: req.ip,
    });
    res.json({ success: true });
  } catch (error: unknown) {
    message = error instanceof Error ? error.message : String(error);
    await logAuditEvent({
      action: 'APPROVE_IDEA',
      userId: req.user?.id,
      userRole: req.user?.userRole as any,
      targetId: ideaId,
      targetType: 'IDEA',
      success: false,
      message,
      ipAddress: req.ip,
    });
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2022') {
      const prismaError = error as { code: string, meta?: { column?: string, modelName?: string }, message?: string };
      return res.status(500).json({ 
        error: `Database schema mismatch: Column '${prismaError.meta?.column}' in model '${prismaError.meta?.modelName}' doesn't exist in the database. Run prisma migrate to update your database.`,
        details: prismaError.message
      });
    }
    res.status(500).json({ error: "Failed to approve idea. Please try again.", details: message });
  }
});

// Reject (delete) an idea
router.post("/reject-idea", requireAdmin, async (req: AuthRequest, res) => {
  const { ideaId } = req.body;
  if (!ideaId) return res.status(400).json({ error: "ideaId required" });
  let success = false;
  let message = '';
  try {
    const submission = await prisma.ideaSubmission.findUnique({
      where: { id: ideaId },
    });
    if (submission) {
      await prisma.ideaSubmission.update({
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
      await logAuditEvent({
        action: 'REJECT_IDEA',
        userId: req.user?.id,
        userRole: req.user?.userRole as any,
        targetId: ideaId,
        targetType: 'IDEA_SUBMISSION',
        success,
        message,
        ipAddress: req.ip,
      });
      return res.json({ success: true });
    }
    await prisma.idea.delete({ where: { id: ideaId } });
    success = true;
    message = 'Idea deleted.';
    await logAuditEvent({
      action: 'REJECT_IDEA',
      userId: req.user?.id,
      userRole: req.user?.userRole as any,
      targetId: ideaId,
      targetType: 'IDEA',
      success,
      message,
      ipAddress: req.ip,
    });
    res.json({ success: true });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
    await logAuditEvent({
      action: 'REJECT_IDEA',
      userId: req.user?.id,
      userRole: req.user?.userRole as any,
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
router.use("/users", usersRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/approve-idea", approveIdeaRoutes);

// Debug logging for approveMentorRoutes
console.log("[Setup] Mounting approveMentorRoutes at /approve-mentor");
router.use("/approve-mentor", approveMentorRoutes);

export default router;
