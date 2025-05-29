import { Router, Response, NextFunction } from "express";
import { authenticateJWT, AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";

const router = Router();
router.use(authenticateJWT);

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.userRole !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// Platform summary
router.get("/summary", requireAdmin, async (req, res) => {
  const [userCount, ideaCount, commentCount, likeCount] = await Promise.all([
    prisma.user.count(),
    prisma.idea.count(),
    prisma.comment.count(),
    prisma.like.count(),
  ]);
  res.json({ userCount, ideaCount, commentCount, likeCount });
});

// Ideas per week for last 8 weeks
router.get("/activity", requireAdmin, async (req, res) => {
  const now = new Date();
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(now);
    start.setDate(now.getDate() - 7 * i);
    const end = new Date(start);
    end.setDate(start.getDate() - 7);
    return { start, end };
  });
  const activity = await Promise.all(
    weeks.map(async ({ start, end }) => {
      const count = await prisma.idea.count({
        where: {
          createdAt: { gte: end, lt: start },
        },
      });
      return { weekStart: end, weekEnd: start, count };
    })
  );
  res.json(activity.reverse());
});

export default router;
