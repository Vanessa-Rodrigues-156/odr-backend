import { Router, Request, Response, NextFunction } from "express";
import prisma from "../../lib/prisma";
import { authenticateJWT, AuthRequest } from "../../middleware/auth";

// Create separate routers for different auth levels
const router = Router();
const authenticatedRouter = Router();
const adminRouter = Router();

// Apply base JWT authentication to all routes
router.use(authenticateJWT);

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// Middleware to ensure user is an admin
const ensureAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (req.user.userRole !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  
  next();
};

// Apply authentication middleware to their respective routers
authenticatedRouter.use(ensureAuthenticated);
adminRouter.use(ensureAdmin);

// --- IDEA SUBMISSION FLOW ---

// Submit a new idea (goes to IdeaSubmission, not Idea)
// Protected route - requires authentication
authenticatedRouter.post("/submit", async (req: AuthRequest, res) => {
  const { title, caption, description, priorOdrExperience } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: "Title and description are required." });
  }
  try {
    // Since we've used the ensureAuthenticated middleware, req.user is guaranteed to be defined
    const submission = await prisma.ideaSubmission.create({
      data: {
        title,
        caption: caption || null,
        description,
        priorOdrExperience: priorOdrExperience || null,
        ownerId: req.user!.id, // Non-null assertion since middleware guarantees this
      },
      include: { owner: true },
    });
    res.status(201).json(submission);
  } catch (err) {
    res.status(500).json({ error: "Failed to submit idea." });
  }
});

// Admin: List all pending idea submissions
adminRouter.get("/submissions", async (req: AuthRequest, res) => {
  // Using ensureAdmin middleware means req.user is guaranteed to be defined and have ADMIN role
  const submissions = await prisma.ideaSubmission.findMany({
    where: { reviewed: false },
    include: { owner: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(submissions);
});

// Admin: Approve an idea submission
adminRouter.post("/submissions/:id/approve", async (req: AuthRequest, res) => {
  const { id } = req.params;
  const submission = await prisma.ideaSubmission.findUnique({ where: { id } });
  if (!submission) return res.status(404).json({ error: "Submission not found" });

  // Create Idea from submission
  const idea = await prisma.idea.create({
    data: {
      title: submission.title,
      caption: submission.caption,
      description: submission.description,
      priorOdrExperience: submission.priorOdrExperience,
      ownerId: submission.ownerId,
      approved: true,
      reviewedAt: new Date(),
      reviewedBy: req.user!.id, // Non-null assertion since middleware guarantees this
    },
  });

  // Mark submission as reviewed/approved
  await prisma.ideaSubmission.update({
    where: { id },
    data: { reviewed: true, approved: true, reviewedAt: new Date(), reviewedBy: req.user!.id },
  });

  res.json({ success: true, idea });
});

// Admin: Reject an idea submission
adminRouter.post("/submissions/:id/reject", async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const submission = await prisma.ideaSubmission.findUnique({ where: { id } });
  if (!submission) return res.status(404).json({ error: "Submission not found" });

  await prisma.ideaSubmission.update({
    where: { id },
    data: {
      reviewed: true,
      approved: false,
      rejected: true,
      rejectionReason: reason || null,
      reviewedAt: new Date(),
      reviewedBy: req.user!.id, // Non-null assertion since middleware guarantees this
    },
  });

  res.json({ success: true });
});

// --- EXISTING IDEA ROUTES ---

// List all ideas (admin only)
adminRouter.get("/", async (req: AuthRequest, res) => {
  const ideas = await prisma.idea.findMany({
    include: {
      owner: true,
      collaborators: { include: { user: true } },
      mentors: { include: { user: true } },
      comments: true,
      likes: true,
      meetings: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(ideas);
});

// Create a new idea (for admin only, normal users use /submit)
adminRouter.post("/", async (req: AuthRequest, res) => {
  const { title, caption, description, priorOdrExperience, ownerId } = req.body;
  if (!title || !description || !ownerId) {
    return res.status(400).json({ error: "Title, description, and ownerId are required." });
  }
  try {
    const idea = await prisma.idea.create({
      data: {
        title,
        caption: caption || null,
        description,
        priorOdrExperience: priorOdrExperience || null,
        ownerId,
        approved: true,
        reviewedAt: new Date(),
        reviewedBy: req.user!.id,
      },
      include: {
        owner: true,
        collaborators: true,
        mentors: true,
        comments: true,
        likes: true,
      },
    });
    res.status(201).json(idea);
  } catch (err) {
    res.status(500).json({ error: "Failed to create idea." });
  }
});

// Get all approved ideas (for ODR Lab page)
router.get("/approved", async (req: Request, res: Response) => {
  try {
    const ideas = await prisma.idea.findMany({
      where: { approved: true },
      include: {
        owner: true,
        likes: true,
        comments: true,
      },
      orderBy: { createdAt: "desc" },
    });
    // Map to frontend format
    const mapped = ideas.map(idea => ({
      id: idea.id,
      name: idea.owner?.name || "Anonymous",
      email: idea.owner?.email || "anonymous@example.com",
      country: idea.owner?.country || "",
      title: idea.title,
      caption: idea.caption,
      description: idea.description,
      submittedAt: idea.createdAt.toISOString(),
      likes: idea.likes?.length || 0,
      commentCount: idea.comments?.length || 0,
    }));
    res.json(mapped);
  } catch (err) {
    console.error("[Ideas] Error fetching approved ideas:", err);
    res.status(500).json({ error: "Failed to fetch ideas" });
  }
});

// Get idea details (for discussion board, must be approved)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const idea = await prisma.idea.findUnique({
      where: { id: req.params.id, approved: true },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            userRole: true,
            country: true,
            institution: true,
            city: true,
            highestEducation: true,
          }
        },
        collaborators: {
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
                highestEducation: true,
              }
            }
          }
        },
        mentors: {
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
                highestEducation: true,
              }
            }
          }
        },
        likes: true,
        comments: {
          include: {
            user: true,
            likes: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!idea)
      return res.status(404).json({ error: "Idea not found or not approved" });
    res.json(idea);
  } catch (err) {
    console.error("[Ideas] Error fetching idea details:", err);
    res.status(500).json({ error: "Failed to fetch idea details" });
  }
});

// Update idea (owner only)
authenticatedRouter.put("/:id", async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { title, caption, description, priorOdrExperience } = req.body;
  const idea = await prisma.idea.findUnique({ where: { id } });
  if (!idea) return res.status(404).json({ error: "Idea not found" });
  if (idea.ownerId !== req.user!.id && req.user!.userRole !== "ADMIN") {
    return res.status(403).json({ error: "Not authorized" });
  }
  const updated = await prisma.idea.update({
    where: { id },
    data: { title, caption, description, priorOdrExperience },
  });
  res.json(updated);
});

// Delete idea (owner or admin)
authenticatedRouter.delete("/:id", async (req: AuthRequest, res) => {
  const { id } = req.params;
  const idea = await prisma.idea.findUnique({ where: { id } });
  if (!idea) return res.status(404).json({ error: "Idea not found" });
  if (idea.ownerId !== req.user!.id && req.user!.userRole !== "ADMIN") {
    return res.status(403).json({ error: "Not authorized" });
  }
  await prisma.idea.delete({ where: { id } });
  res.json({ success: true });
});

// List collaborators
router.get("/:id/collaborators", async (req, res) => {
  const { id } = req.params;
  const collaborators = await prisma.ideaCollaborator.findMany({
    where: { ideaId: id },
    include: { user: true },
  });
  res.json(collaborators);
});

// Add collaborator
authenticatedRouter.post("/:id/collaborators", async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const collab = await prisma.ideaCollaborator.create({
    data: { ideaId: id, userId },
  });
  res.status(201).json(collab);
});

// List mentors
router.get("/:id/mentors", async (req, res) => {
  const { id } = req.params;
  const mentors = await prisma.ideaMentor.findMany({
    where: { ideaId: id },
    include: { user: true },
  });
  res.json(mentors);
});

// Add mentor
authenticatedRouter.post("/:id/mentors", async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const mentor = await prisma.ideaMentor.create({
    data: { ideaId: id, userId },
  });
  res.status(201).json(mentor);
});

// List comments
router.get("/:id/comments", async (req, res) => {
  const { id } = req.params;
  const comments = await prisma.comment.findMany({
    where: { ideaId: id },
    include: { user: true, replies: true, likes: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(comments);
});

// Add comment
authenticatedRouter.post("/:id/comments", async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { content, parentId } = req.body;
  if (!content) return res.status(400).json({ error: "Content required" });
  const comment = await prisma.comment.create({
    data: {
      content,
      ideaId: id,
      userId: req.user!.id,
      parentId: parentId || null,
    },
    include: { user: true, replies: true, likes: true },
  });
  res.status(201).json(comment);
});

// Like/unlike idea
authenticatedRouter.post("/:id/like", async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'like' or 'unlike'
  if (!["like", "unlike"].includes(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }
  if (action === "like") {
    const like = await prisma.like.upsert({
      where: { userId_ideaId: { userId: req.user!.id, ideaId: id } },
      update: {},
      create: { userId: req.user!.id, ideaId: id },
    });
    return res.json({ liked: true, like });
  } else {
    await prisma.like.deleteMany({
      where: { userId: req.user!.id, ideaId: id },
    });
    return res.json({ liked: false });
  }
});

// Mount authenticated and admin routers on the main router
router.use("/", authenticatedRouter);
router.use("/", adminRouter);

export default router;
