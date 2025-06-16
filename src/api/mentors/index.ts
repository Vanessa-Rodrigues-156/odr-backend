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
        createdAt: true,
        // Include the mentor-specific data
        mentor: {
          select: {
            mentorType: true,
            organization: true,
            role: true,
            expertise: true,
            description: true,
          }
        },
        // Get ideas where this user is a mentor using ideaMentors relation
        ideaMentors: {
          include: {
            idea: {
              select: {
                id: true,
                title: true,
                caption: true,
                description: true,
                createdAt: true,
              }
            }
          }
        }
      }
    });

    // Process the data to flatten it and make it more convenient for frontend use
    const processedMentors = mentors.map(mentor => {
      // Extract the mentor-specific data
      const mentorSpecificData = mentor.mentor || {};

      // Extract the ideas this user mentors
      const mentoringIdeas = mentor.ideaMentors.map(relationship => ({
        role: relationship.role,
        idea: relationship.idea
      }));

      // Return flattened structure
      return {
        id: mentor.id,
        name: mentor.name,
        email: mentor.email,
        contactNumber: mentor.contactNumber,
        city: mentor.city,
        country: mentor.country,
        createdAt: mentor.createdAt,
        // Add mentor-specific fields
        ...mentorSpecificData,
        // Add mentored ideas
        mentoringIdeas
      };
    });

    res.json({ mentors: processedMentors });
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
        createdAt: true,
        // Include the mentor-specific data
        mentor: true,
        // Get ideas where this user is a mentor
        ideaMentors: {
          include: {
            idea: {
              select: {
                id: true,
                title: true,
                caption: true,
                description: true,
                createdAt: true,
              }
            }
          }
        }
      }
    });

    if (!mentor) {
      return res.status(404).json({ error: "Mentor not found" });
    }

    // Process data to flatten the structure
    const mentorData = {
      id: mentor.id,
      name: mentor.name,
      email: mentor.email,
      contactNumber: mentor.contactNumber,
      city: mentor.city,
      country: mentor.country,
      createdAt: mentor.createdAt,
      // Add mentor-specific fields
      mentorType: mentor.mentor?.mentorType,
      organization: mentor.mentor?.organization,
      role: mentor.mentor?.role,
      expertise: mentor.mentor?.expertise,
      description: mentor.mentor?.description,
      // Add mentored ideas
      mentoringIdeas: mentor.ideaMentors.map(relationship => ({
        role: relationship.role,
        idea: relationship.idea
      }))
    };

    res.json(mentorData);
  } catch (error) {
    console.error("Error fetching mentor:", error);
    res.status(500).json({ error: "Failed to fetch mentor" });
  }
});

export default router;
