import { Router, Response, NextFunction } from "express";
import { authenticateJWT, AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";

// Create routers for different auth levels
const router = Router();
const authenticatedRouter = Router();

// Apply base JWT authentication to all routes
router.use(authenticateJWT);

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// Apply authentication middleware
authenticatedRouter.use(ensureAuthenticated);

// Get collaborators for an idea
router.get("/:ideaId/collaborators", async (req, res) => {
  const { ideaId } = req.params;
  try {
    const collaborators = await prisma.ideaCollaborator.findMany({
      where: { ideaId },
      include: { 
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            userRole: true,
            country: true,
            institution: true,
            city: true,
          }
        }
      },
    });
    res.json(collaborators);
  } catch (error) {
    console.error("Failed to get collaborators:", error);
    res.status(500).json({ error: "Failed to fetch collaborators" });
  }
});

// Get mentors for an idea
router.get("/:ideaId/mentors", async (req, res) => {
  const { ideaId } = req.params;
  try {
    const mentors = await prisma.ideaMentor.findMany({
      where: { ideaId },
      include: { 
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            userRole: true,
            country: true,
            institution: true,
            city: true,
          }
        }
      },
    });
    res.json(mentors);
  } catch (error) {
    console.error("Failed to get mentors:", error);
    res.status(500).json({ error: "Failed to fetch mentors" });
  }
});

// Join as collaborator - requires authentication
authenticatedRouter.post("/:ideaId/join-collaborator", async (req: AuthRequest, res) => {
  const { ideaId } = req.params;
  const userId = req.user!.id; // Non-null assertion is safe due to middleware
  
  try {
    // Check if user is already a collaborator
    const existingCollab = await prisma.ideaCollaborator.findUnique({
      where: { 
        userId_ideaId: { userId, ideaId }
      }
    });
    
    if (existingCollab) {
      return res.status(400).json({ error: "You are already a collaborator for this idea" });
    }
    
    // Check if idea exists and is approved
    const idea = await prisma.idea.findUnique({
      where: { id: ideaId, approved: true }
    });
    
    if (!idea) {
      return res.status(404).json({ error: "Idea not found or not approved" });
    }
    
    // Check if user is the owner (cannot be both owner and collaborator)
    if (idea.ownerId === userId) {
      return res.status(400).json({ error: "You cannot join as a collaborator to your own idea" });
    }
    
    // Add user as collaborator
    const collaborator = await prisma.ideaCollaborator.create({
      data: { userId, ideaId },
      include: { user: true }
    });
    
    res.status(201).json({
      success: true,
      message: "Successfully joined as collaborator",
      collaborator
    });
    
  } catch (error) {
    console.error("Failed to join as collaborator:", error);
    res.status(500).json({ error: "Failed to join as collaborator" });
  }
});

// Leave as collaborator - requires authentication
authenticatedRouter.delete("/:ideaId/leave-collaborator", async (req: AuthRequest, res) => {
  const { ideaId } = req.params;
  const userId = req.user!.id; // Non-null assertion is safe due to middleware
  
  try {
    // Delete the collaborator record
    await prisma.ideaCollaborator.delete({
      where: { 
        userId_ideaId: { userId, ideaId }
      }
    });
    
    res.json({
      success: true,
      message: "Successfully left collaboration"
    });
    
  } catch (error) {
    console.error("Failed to leave collaboration:", error);
    res.status(500).json({ error: "Failed to leave collaboration. You may not be a collaborator." });
  }
});

// Request to become a mentor - requires authentication
authenticatedRouter.post("/:ideaId/request-mentor", async (req: AuthRequest, res) => {
  const { ideaId } = req.params;
  const userId = req.user!.id; // Non-null assertion is safe due to middleware
  
  try {
    // Check if user is already a mentor
    const existingMentor = await prisma.ideaMentor.findUnique({
      where: { 
        userId_ideaId: { userId, ideaId }
      }
    });
    
    if (existingMentor) {
      return res.status(400).json({ error: "You are already a mentor for this idea" });
    }
    
    // Check if user has MENTOR role
    if (req.user!.userRole !== 'MENTOR') {
      return res.status(403).json({ error: "Only users with MENTOR role can become mentors" });
    }
    
    // Check if idea exists and is approved
    const idea = await prisma.idea.findUnique({
      where: { id: ideaId, approved: true }
    });
    
    if (!idea) {
      return res.status(404).json({ error: "Idea not found or not approved" });
    }
    
    // Add user as mentor
    const mentor = await prisma.ideaMentor.create({
      data: { userId, ideaId },
      include: { user: true }
    });
    
    res.status(201).json({
      success: true,
      message: "Successfully joined as mentor",
      mentor
    });
    
  } catch (error) {
    console.error("Failed to join as mentor:", error);
    res.status(500).json({ error: "Failed to join as mentor" });
  }
});

// Leave as mentor - requires authentication
authenticatedRouter.delete("/:ideaId/leave-mentor", async (req: AuthRequest, res) => {
  const { ideaId } = req.params;
  const userId = req.user!.id; // Non-null assertion is safe due to middleware
  
  try {
    // Delete the mentor record
    await prisma.ideaMentor.delete({
      where: { 
        userId_ideaId: { userId, ideaId }
      }
    });
    
    res.json({
      success: true,
      message: "Successfully left mentorship"
    });
    
  } catch (error) {
    console.error("Failed to leave mentorship:", error);
    res.status(500).json({ error: "Failed to leave mentorship. You may not be a mentor." });
  }
});

// Mount authenticated router on the main router
router.use("/", authenticatedRouter);

export default router;
