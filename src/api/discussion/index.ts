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

// Apply authentication middleware to authenticated router
authenticatedRouter.use(ensureAuthenticated);

// Get all comments for an idea
router.get("/:ideaId/comments", async (req, res) => {
  const { ideaId } = req.params;
  const comments = await prisma.comment.findMany({
    where: { ideaId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, email: true } } }, // Changed from user to author
  });
  res.json(comments);
});

// Add a comment to an idea - requires authentication
authenticatedRouter.post("/:ideaId/comments", async (req: AuthRequest, res) => {
  const { ideaId } = req.params;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "Content required" });
  const comment = await prisma.comment.create({
    data: {
      content,
      ideaId,
      authorId: req.user!.id, // Changed from userId to authorId
    },
  });
  res.status(201).json(comment);
});

// Like/unlike an idea - requires authentication
authenticatedRouter.post("/:ideaId/likes", async (req: AuthRequest, res) => {
  const { ideaId } = req.params;
  const { action } = req.body; // 'like' or 'unlike'
  const userId = req.user!.id;

  if (action === "like") {
    const like = await prisma.like.upsert({
      where: { 
        userId_ideaId: {  // This is correct based on the schema's unique constraint order
          userId,
          ideaId
        }
      },
      update: {},
      create: { userId, ideaId },
    });
    return res.json({ liked: true });
  } else if (action === "unlike") {
    await prisma.like.deleteMany({
      where: { userId, ideaId },
    });
    return res.json({ liked: false });
  } else {
    return res.status(400).json({ error: "Invalid action. Use 'like' or 'unlike'" });
  }
});

// Check if user liked the idea - requires authentication
authenticatedRouter.get("/:ideaId/likes/check", async (req: AuthRequest, res) => {
  const { ideaId } = req.params;
  const userId = req.user!.id;
  const like = await prisma.like.findUnique({
    where: { 
      userId_ideaId: {  // Fix: use the correct compound key format
        userId,
        ideaId
      }
    },
  });
  res.json({ hasLiked: !!like });
});

// Get liked comments for a user on an idea - requires authentication
authenticatedRouter.get("/:ideaId/comments/liked", async (req: AuthRequest, res) => {
  const { ideaId } = req.params;
  const userId = req.user!.id; // Non-null assertion since middleware guarantees this
  const likedComments = await prisma.like.findMany({
    where: { userId, comment: { ideaId } },
    select: { commentId: true },
  });
  res.json({ likedCommentIds: likedComments.map((lc: any) => lc.commentId) });
});

// Add route for liking/unliking a specific comment to match frontend
authenticatedRouter.post("/:ideaId/comments/:commentId/likes", async (req: AuthRequest, res) => {
  const { commentId } = req.params;
  const { action } = req.body;
  const userId = req.user!.id;

  if (action === "like") {
    await prisma.like.upsert({
      where: { 
        userId_commentId: {  // Fix: use the correct compound key format
          userId,
          commentId
        }
      },
      update: {},
      create: { userId, commentId },
    });
    return res.json({ liked: true });
  } else if (action === "unlike") {
    await prisma.like.deleteMany({
      where: { userId, commentId },
    });
    return res.json({ liked: false });
  } else {
    return res.status(400).json({ error: "Invalid action. Use 'like' or 'unlike'" });
  }
});

// Mount authenticated router on the main router
router.use("/", authenticatedRouter);

export default router;
