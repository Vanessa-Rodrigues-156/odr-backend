"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const prisma_1 = __importDefault(require("../../lib/prisma"));
// Create routers for different auth levels
const router = (0, express_1.Router)();
const authenticatedRouter = (0, express_1.Router)();
// Apply base JWT authentication to all routes
router.use(auth_1.authenticateJWT);
// Middleware to ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
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
        const collaborators = await prisma_1.default.ideaCollaborator.findMany({
            where: { ideaId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        userRole: true,
                        country: true,
                        city: true,
                        // Include role-specific tables instead of direct fields
                        innovator: true,
                        mentor: true,
                        faculty: true,
                        other: true,
                    }
                }
            },
        });
        // Process user data to include role-specific fields
        const processedCollaborators = collaborators.map(collab => ({
            ...collab,
            user: processUserFields(collab.user)
        }));
        res.json(processedCollaborators);
    }
    catch (error) {
        console.error("Failed to get collaborators:", error);
        res.status(500).json({ error: "Failed to fetch collaborators" });
    }
});
// Get mentors for an idea
router.get("/:ideaId/mentors", async (req, res) => {
    const { ideaId } = req.params;
    try {
        const mentors = await prisma_1.default.ideaMentor.findMany({
            where: { ideaId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        userRole: true,
                        country: true,
                        city: true,
                        // Include role-specific tables instead of direct fields
                        innovator: true,
                        mentor: true,
                        faculty: true,
                        other: true,
                    }
                }
            },
        });
        // Process user data to include role-specific fields
        const processedMentors = mentors.map(mentor => ({
            ...mentor,
            user: processUserFields(mentor.user)
        }));
        res.json(processedMentors);
    }
    catch (error) {
        console.error("Failed to get mentors:", error);
        res.status(500).json({ error: "Failed to fetch mentors" });
    }
});
// Join as collaborator - requires authentication
authenticatedRouter.post("/:ideaId/join-collaborator", async (req, res) => {
    const { ideaId } = req.params;
    const userId = req.user.id; // Non-null assertion is safe due to middleware
    try {
        // Check if user is already a collaborator
        const existingCollaboration = await prisma_1.default.ideaCollaborator.findFirst({
            where: {
                AND: [
                    { ideaId: ideaId },
                    { userId: userId }
                ]
            }
        });
        if (existingCollaboration) {
            return res.status(400).json({ error: "You are already a collaborator for this idea" });
        }
        // Check if idea exists and is approved
        const idea = await prisma_1.default.idea.findUnique({
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
        const collaborator = await prisma_1.default.ideaCollaborator.create({
            data: { userId, ideaId },
            include: { user: true }
        });
        res.status(201).json({
            success: true,
            message: "Successfully joined as collaborator",
            collaborator
        });
    }
    catch (error) {
        console.error("Failed to join as collaborator:", error);
        res.status(500).json({ error: "Failed to join as collaborator" });
    }
});
// Leave as collaborator - requires authentication
authenticatedRouter.delete("/:ideaId/leave-collaborator", async (req, res) => {
    const { ideaId } = req.params;
    const userId = req.user.id;
    try {
        // Delete the collaborator record using a findFirst + delete approach
        const collaboration = await prisma_1.default.ideaCollaborator.findFirst({
            where: {
                AND: [
                    { ideaId: ideaId },
                    { userId: userId }
                ]
            }
        });
        if (!collaboration) {
            return res.status(404).json({
                success: false,
                message: "Collaboration not found"
            });
        }
        await prisma_1.default.ideaCollaborator.delete({
            where: {
                id: collaboration.id
            }
        });
        res.json({
            success: true,
            message: "Successfully left collaboration"
        });
    }
    catch (error) {
        console.error("Failed to leave collaboration:", error);
        res.status(500).json({ error: "Failed to leave collaboration. You may not be a collaborator." });
    }
});
// Request to become a mentor - requires authentication
authenticatedRouter.post("/:ideaId/request-mentor", async (req, res) => {
    const { ideaId } = req.params;
    const userId = req.user.id; // Non-null assertion is safe due to middleware
    try {
        // Check if user is already a mentor
        const existingMentor = await prisma_1.default.ideaMentor.findFirst({
            where: {
                AND: [
                    { ideaId: ideaId },
                    { userId: userId }
                ]
            }
        });
        if (existingMentor) {
            return res.status(400).json({ error: "You are already a mentor for this idea" });
        }
        // Check if user has MENTOR role and is approved
        if (req.user.userRole !== 'MENTOR') {
            return res.status(403).json({ error: "Only users with MENTOR role can become mentors" });
        }
        // Check if mentor is approved
        if (!req.user?.isMentorApproved) {
            return res.status(403).json({ error: "Your mentor application is still pending approval" });
        }
        // Check if idea exists and is approved
        const idea = await prisma_1.default.idea.findUnique({
            where: { id: ideaId, approved: true }
        });
        if (!idea) {
            return res.status(404).json({ error: "Idea not found or not approved" });
        }
        // Add user as mentor
        const mentor = await prisma_1.default.ideaMentor.create({
            data: { userId, ideaId },
            include: { user: true }
        });
        res.status(201).json({
            success: true,
            message: "Successfully joined as mentor",
            mentor
        });
    }
    catch (error) {
        console.error("Failed to join as mentor:", error);
        res.status(500).json({ error: "Failed to join as mentor" });
    }
});
// Leave as mentor - requires authentication
authenticatedRouter.delete("/:ideaId/leave-mentor", async (req, res) => {
    const { ideaId } = req.params;
    const userId = req.user.id;
    try {
        // Delete the mentor record using a findFirst + delete approach
        const mentor = await prisma_1.default.ideaMentor.findFirst({
            where: {
                AND: [
                    { ideaId: ideaId },
                    { userId: userId }
                ]
            }
        });
        if (!mentor) {
            return res.status(404).json({
                success: false,
                message: "Mentorship not found"
            });
        }
        await prisma_1.default.ideaMentor.delete({
            where: {
                id: mentor.id
            }
        });
        res.json({
            success: true,
            message: "Successfully left mentorship"
        });
    }
    catch (error) {
        console.error("Failed to leave mentorship:", error);
        res.status(500).json({ error: "Failed to leave mentorship. You may not be a mentor." });
    }
});
// Helper function to process user fields from role-specific tables
function processUserFields(user) {
    if (!user)
        return user;
    // Create a processed user object without the role-specific records
    const processedUser = { ...user };
    // Add role-specific fields based on user role
    if (user.userRole === "INNOVATOR" && user.innovator) {
        processedUser.institution = user.innovator.institution;
        processedUser.highestEducation = user.innovator.highestEducation;
        processedUser.courseName = user.innovator.courseName;
        processedUser.courseStatus = user.innovator.courseStatus;
        processedUser.description = user.innovator.description;
    }
    else if (user.userRole === "FACULTY" && user.faculty) {
        processedUser.institution = user.faculty.institution;
        processedUser.role = user.faculty.role;
        processedUser.expertise = user.faculty.expertise;
    }
    else if (user.userRole === "MENTOR" && user.mentor) {
        processedUser.mentorType = user.mentor.mentorType;
        processedUser.organization = user.mentor.organization;
        processedUser.role = user.mentor.role;
        processedUser.expertise = user.mentor.expertise;
    }
    else if (user.userRole === "OTHER" && user.other) {
        processedUser.role = user.other.role;
        processedUser.workplace = user.other.workplace;
        processedUser.description = user.other.description;
    }
    // Remove the role-specific records to avoid duplicating data
    delete processedUser.innovator;
    delete processedUser.mentor;
    delete processedUser.faculty;
    delete processedUser.other;
    return processedUser;
}
// Mount authenticated router on the main router
router.use("/", authenticatedRouter);
exports.default = router;
