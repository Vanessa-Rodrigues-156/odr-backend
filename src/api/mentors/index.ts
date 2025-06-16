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
      // Extract the mentor-specific data - ensure it's always an object even if null
      const mentorSpecificData = mentor.mentor || {
        mentorType: null,
        organization: null,
        role: null,
        expertise: null,
        description: null
      };

      // Extract the ideas this user mentors - with safer handling
      const mentoringIdeas = Array.isArray(mentor.ideaMentors) 
        ? mentor.ideaMentors.map(relationship => ({
            role: relationship.role || 'Mentor',
            idea: relationship.idea
          }))
        : [];

      // Return flattened structure
      return {
        id: mentor.id,
        name: mentor.name || 'Unnamed Mentor',
        email: mentor.email || '',
        contactNumber: mentor.contactNumber || '',
        city: mentor.city || '',
        country: mentor.country || '',
        createdAt: mentor.createdAt,
        // Add mentor-specific fields with defaults
        mentorType: mentorSpecificData.mentorType || null,
        organization: mentorSpecificData.organization || null, 
        institution: mentorSpecificData.organization || null, // Added for frontend compatibility
        role: mentorSpecificData.role || null,
        expertise: mentorSpecificData.expertise || null,
        description: mentorSpecificData.description || null,
        // Add mentored ideas
        mentoringIdeas
      };
    });

    res.json({ mentors: processedMentors });
  } catch (error) {
    console.error("Error fetching mentors:", error);
    res.status(500).json({ error: "Failed to fetch mentors", details: error instanceof Error ? error.message : "Unknown error" });
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

    // Process data to flatten the structure with better null handling
    const mentorData = {
      id: mentor.id,
      name: mentor.name || 'Unnamed Mentor',
      email: mentor.email || '',
      contactNumber: mentor.contactNumber || '',
      city: mentor.city || '',
      country: mentor.country || '',
      createdAt: mentor.createdAt,
      // Add mentor-specific fields with null safety
      mentorType: mentor.mentor?.mentorType || null,
      organization: mentor.mentor?.organization || null,
      institution: mentor.mentor?.organization || null, // Added for frontend compatibility
      role: mentor.mentor?.role || null,
      expertise: mentor.mentor?.expertise || null,
      description: mentor.mentor?.description || null,
      // Add mentored ideas with safety checks
      mentoringIdeas: Array.isArray(mentor.ideaMentors) 
        ? mentor.ideaMentors.map(relationship => ({
            role: relationship.role || 'Mentor',
            idea: relationship.idea
          }))
        : []
    };

    res.json(mentorData);
  } catch (error) {
    console.error("Error fetching mentor:", error);
    res.status(500).json({ error: "Failed to fetch mentor", details: error instanceof Error ? error.message : "Unknown error" });
  }
});

export default router;
