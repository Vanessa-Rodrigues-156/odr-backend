import { Router } from "express";
import { AuthRequest } from "../../types/auth";
import prisma from "../../lib/prisma";
import profileHandler from "./profile";
import rateLimit from "express-rate-limit";

const router = Router();

// Rate limiter for mentor application (20 requests per 10 minutes)
const formLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  message: { error: "Too many mentor applications, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Profile routes
router.get("/profile", profileHandler);
router.put("/profile", profileHandler);

// Stats route
router.get("/stats", async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const userId = req.user.id;
    
    // Get count of user's ideas
    const ideasCount = await prisma.idea.count({
      where: { ownerId: userId }
    });
    
    // Get count of user's collaborations (projects they're collaborating on but didn't create)
    const collaborationsCount = await prisma.ideaCollaborator.count({
      where: { userId }
    });
    
    // Get mentorship count based on role
    let mentorshipsCount = 0;
    
    if (req.user.userRole === "MENTOR") {
      // If user is a mentor, count projects they're mentoring
      mentorshipsCount = await prisma.ideaMentor.count({
        where: { userId }
      });
    } else {
      // For other users, count mentors on their projects
      mentorshipsCount = await prisma.ideaMentor.count({
        where: {
          idea: {
            ownerId: userId
          }
        }
      });
    }
    
    res.json({
      ideasCount,
      collaborationsCount,
      mentorshipsCount
    });
    
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API endpoint to apply as mentor (for users who were rejected previously)
router.post("/apply-mentor", formLimiter, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const userId = req.user.id;
    const { mentorType, organization, expertise, description } = req.body;
    
    if (!mentorType || !description) {
      return res.status(400).json({ error: "Required fields missing" });
    }
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Use a transaction for consistent updates
    const result = await prisma.$transaction(async (tx) => {
      // Update user's role to OTHER (should remain as OTHER until approved by admin)
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          userRole: "OTHER"
        }
      });
      
      // Check if mentor record exists
      const existingMentor = await tx.mentor.findUnique({
        where: { userId }
      });
      
      let mentorRecord;
      
      if (existingMentor) {
        // Update existing mentor record
        mentorRecord = await tx.mentor.update({
          where: { userId },
          data: {
            mentorType: mentorType as any,  // Cast to corresponding enum type
            organization,
            expertise,
            description,
            approved: false,  // Reset approval status
            rejectionReason: null,  // Clear previous rejection reason
            reviewedAt: null,  // Reset review timestamp
            reviewedBy: null   // Reset reviewer reference
          }
        });
      } else {
        // Create new mentor record
        mentorRecord = await tx.mentor.create({
          data: {
            userId,
            mentorType: mentorType as any,  // Cast to corresponding enum type
            organization,
            expertise,
            description,
            approved: false
          }
        });
      }
      
      // Delete from "other" table if present
      const otherRecord = await tx.other.findUnique({
        where: { userId }
      });
      
      if (otherRecord) {
        await tx.other.delete({
          where: { userId }
        });
      }
      
      return { user: updatedUser, mentor: mentorRecord };
    });
    
    res.status(200).json({
      success: true,
      message: "Mentor application submitted successfully"
    });
    
  } catch (error) {
    console.error("Error applying as mentor:", error);
    res.status(500).json({ 
      error: "Failed to submit mentor application",
      details: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

export default router;
