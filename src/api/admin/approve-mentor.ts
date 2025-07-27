import { Router } from "express";
import prisma from "../../lib/prisma";
import { authenticateJWT } from "../../middleware/auth";
import { AuthRequest } from "../../types/auth";
import { logAuditEvent } from "../../lib/auditLog";

const router = Router();
router.use(authenticateJWT);

// Middleware to check if user is an admin
const ensureAdmin = (req: AuthRequest, res: any, next: any) => {
  if (req.user && req.user.userRole === "ADMIN") {
    next();
  } else {
    return res.status(403).json({ error: "Admin access required" });
  }
};

// Use admin middleware for all routes
router.use(ensureAdmin);

// GET - List all pending mentor approvals
router.get("/", async (req: AuthRequest, res) => {
  try {
    console.log("[Admin] Fetching pending mentors for approval");
    
    const pendingMentors = await prisma.user.findMany({
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
  } catch (error) {
    console.error("[Admin] Error fetching pending mentors:", error);
    res.status(500).json({ error: "Failed to fetch pending mentors" });
  }
});

// POST - Approve a mentor
router.post("/", async (req: AuthRequest, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }
  let success = false;
  let message = '';
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
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
      const updatedMentor = await tx.mentor.update({
        where: { userId: userId },
        data: {
          approved: true,
          reviewedAt: new Date(),
          reviewedBy: req.user?.id,
        }
      });
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          userRole: "MENTOR"
        }
      });
      await tx.other.deleteMany({
        where: { userId: userId }
      }).catch(err => {
        console.warn("Could not delete from 'other' table", err);
      });
      return { user: updatedUser, mentor: updatedMentor };
    });
    success = true;
    message = 'Mentor approved.';
    await logAuditEvent({
      action: 'APPROVE_MENTOR',
      userId: req.user?.id,
      userRole: req.user?.userRole as any,
      targetId: userId,
      targetType: 'MENTOR',
      success,
      message,
      ipAddress: req.ip,
    });
    res.status(200).json({
      success: true,
      user: {
        ...result.user,
        mentor: result.mentor
      }
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
    await logAuditEvent({
      action: 'APPROVE_MENTOR',
      userId: req.user?.id,
      userRole: req.user?.userRole as any,
      targetId: userId,
      targetType: 'MENTOR',
      success: false,
      message,
      ipAddress: req.ip,
    });
    const errorMessage = message;
    let statusCode = 500;
    if (errorMessage.includes("not found")) {
      statusCode = 404;
    } else if (errorMessage.includes("already approved")) {
      statusCode = 400;
    }
    res.status(statusCode).json({ 
      error: "Failed to approve mentor", 
      details: errorMessage
    });
  }
});

// POST - Reject a mentor
router.post("/reject", async (req: AuthRequest, res) => {
  const { userId, reason } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }
  let success = false;
  let message = '';
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId, userRole: "MENTOR" },
        include: { mentor: true }
      });
      if (!user) {
        throw new Error(`User with ID ${userId} not found or is not a mentor`);
      }
      if (!user.mentor) {
        throw new Error(`Mentor data not found for user ${userId}`);
      }
      const updatedMentor = await tx.mentor.update({
        where: { userId: userId },
        data: {
          approved: false,
          rejectionReason: reason || "Application not approved",
          reviewedAt: new Date(),
          reviewedBy: req.user?.id,
        }
      });
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          userRole: "OTHER"
        }
      });
      const existingOther = await tx.other.findUnique({
        where: { userId: userId }
      });
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
    success = true;
    message = 'Mentor rejected.';
    await logAuditEvent({
      action: 'REJECT_MENTOR',
      userId: req.user?.id,
      userRole: req.user?.userRole as any,
      targetId: userId,
      targetType: 'MENTOR',
      success,
      message,
      ipAddress: req.ip,
    });
    res.status(200).json({
      success: true,
      message: "Mentor application has been rejected and user role updated"
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
    await logAuditEvent({
      action: 'REJECT_MENTOR',
      userId: req.user?.id,
      userRole: req.user?.userRole as any,
      targetId: userId,
      targetType: 'MENTOR',
      success: false,
      message,
      ipAddress: req.ip,
    });
    const errorMessage = message;
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

export default router;
