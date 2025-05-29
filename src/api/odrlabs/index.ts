import { Router } from "express";
import { authenticateJWT } from "../../middleware/auth";
import prisma from "../../lib/prisma";

const router = Router();
router.use(authenticateJWT);

// GET /odrlabs/ideas - List all approved ideas for ODR Labs page
router.get("/ideas", async (req, res) => {
  try {
    const ideas = await prisma.idea.findMany({
      where: { approved: true },
      orderBy: { createdAt: "desc" },
      include: {
        owner: {
          select: {
            name: true,
            email: true,
            country: true,
          },
        },
        likes: true,
        comments: true,
      },
    });

    const result = ideas.map((idea) => ({
      id: idea.id,
      name: idea.owner?.name || "Anonymous",
      email: idea.owner?.email || "",
      country: idea.owner?.country || "India",
      title: idea.title,
      caption: idea.caption || "",
      description: idea.description,
      submittedAt: idea.createdAt.toISOString(),
      likes: idea.likes.length,
      commentCount: idea.comments.length,
    }));

    res.json({ ideas: result });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ideas" });
  }
});

export default router;
