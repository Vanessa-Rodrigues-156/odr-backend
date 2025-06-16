import { Router } from "express";
import prisma from "../../lib/prisma";
import { authenticateJWT, AuthRequest } from "../../middleware/auth";

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

// GET - List all idea submissions for admin approval
router.get("/", async (req: AuthRequest, res) => {
  try {
    const submissions = await prisma.ideaSubmission.findMany({
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
    const formattedSubmissions = submissions.map((submission: any) => {
      // Get institution from the appropriate role-specific model
      let institution = null;
      if (submission.owner.userRole === "INNOVATOR" && submission.owner.innovator) {
        institution = submission.owner.innovator.institution;
      } else if (submission.owner.userRole === "FACULTY" && submission.owner.faculty) {
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
  } catch (error) {
    console.error("[Admin] Error fetching idea submissions:", error);
    res.status(500).json({ error: "Failed to fetch idea submissions" });
  }
});

// POST - Approve a submission and create an Idea from it
router.post("/", async (req: AuthRequest, res) => {
  try {
    const { ideaId } = req.body;
    
    if (!ideaId) {
      return res.status(400).json({ error: "Idea ID is required" });
    }

    // Get the submission
    const submission = await prisma.ideaSubmission.findUnique({
      where: { id: ideaId },
      include: { owner: true }
    });

    if (!submission) {
      return res.status(404).json({ error: "Idea submission not found" });
    }

    if (submission.reviewed) {
      return res.status(400).json({ error: "Idea has already been reviewed" });
    }

    // Create a new Idea from the submission data (only using fields that exist in the Idea model)
    const idea = await prisma.idea.create({
      data: {
        title: submission.title,
        caption: submission.caption,
        description: submission.description,
        approved: true,
        ownerId: submission.ownerId,
        // Remove fields that don't exist in the Idea model according to the schema
        // priorOdrExperience: submission.priorOdrExperience,
        // reviewedAt: new Date(),
        // reviewedBy: req.user?.id,
      }
    });

    // Mark the submission as reviewed and approved
    await prisma.ideaSubmission.update({
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
  } catch (error) {
    console.error("[Admin] Error approving idea:", error);
    res.status(500).json({ error: "Failed to approve idea" });
  }
});

export default router;
