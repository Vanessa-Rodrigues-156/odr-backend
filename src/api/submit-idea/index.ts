import { Router, Response, NextFunction } from "express";
import { authenticateJWT, AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";

const router = Router();
// Create an authenticated router for routes that require login
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

// Apply authentication middleware to authenticatedRouter
authenticatedRouter.use(ensureAuthenticated);

// Submit a new idea (pending approval)
authenticatedRouter.post("/", async (req: AuthRequest, res) => {
  const { title, idea_caption, description, odr_experience, consent } =
    req.body;

  if (!title || !description || !odr_experience || !consent) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // req.user is guaranteed to be defined because of ensureAuthenticated middleware
    const idea = await prisma.idea.create({
      data: {
        title,
        caption: idea_caption || null,
        description,
        priorOdrExperience: odr_experience,
        ownerId: req.user!.id,
        approved: false,
      },
    });
    res.status(201).json({
      success: true,
      message: "Idea submitted successfully and awaiting approval",
      ideaId: idea.id,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to submit idea. Please try again later.",
    });
  }
});

// Mount authenticated router on the main router
router.use("/", authenticatedRouter);

export default router;
