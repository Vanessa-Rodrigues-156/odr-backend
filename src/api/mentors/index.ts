import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticateJWT, AuthRequest } from "../../middleware/auth";

const router = Router();

// Apply base JWT authentication to all routes
router.use(authenticateJWT);

// Get all mentors
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const mentors = await prisma.user.findMany({
      where: {
        userRole: "MENTOR"
      },
      select: {
        id: true,
        name: true,
        email: true,
        contactNumber: true,
        city: true,
        country: true,
        institution: true,
        highestEducation: true,
        odrLabUsage: true,
        createdAt: true,
        mentoringIdeas: {
          include: {
            idea: {
              select: {
                id: true,
                title: true,
                caption: true,
                description: true,
                createdAt: true,
                views: true
              }
            }
          }
        }
      }
    });

    res.json({ mentors });
  } catch (error) {
    console.error("Error fetching mentors:", error);
    res.status(500).json({ error: "Failed to fetch mentors" });
  }
});

// Get specific mentor by ID with their ideas
router.get("/:id", async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const mentor = await prisma.user.findUnique({
      where: { id, userRole: "MENTOR" },
      select: {
        id: true,
        name: true,
        email: true,
        contactNumber: true,
        city: true,
        country: true,
        institution: true,
        highestEducation: true,
        odrLabUsage: true,
        createdAt: true,
        mentoringIdeas: {
          include: {
            idea: {
              select: {
                id: true,
                title: true,
                caption: true,
                description: true,
                createdAt: true,
                views: true
              }
            }
          }
        }
      }
    });

    if (!mentor) {
      return res.status(404).json({ error: "Mentor not found" });
    }

    res.json(mentor);
  } catch (error) {
    console.error("Error fetching mentor:", error);
    res.status(500).json({ error: "Failed to fetch mentor" });
  }
});

export default router;
