"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const auth_1 = require("../../middleware/auth");
// Create separate routers for different auth levels
const router = (0, express_1.Router)();
const authenticatedRouter = (0, express_1.Router)();
const adminRouter = (0, express_1.Router)();
// Apply base JWT authentication to all routes
router.use(auth_1.authenticateJWT);
// Middleware to ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
    }
    next();
};
// Middleware to ensure user is an admin
const ensureAdmin = (req, res, next) => {
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
authenticatedRouter.post("/submit", async (req, res) => {
    const { title, caption, description, priorOdrExperience } = req.body;
    if (!title || !description) {
        return res.status(400).json({ error: "Title and description are required." });
    }
    try {
        // Since we've used the ensureAuthenticated middleware, req.user is guaranteed to be defined
        const submission = await prisma_1.default.ideaSubmission.create({
            data: {
                title,
                caption: caption || null,
                description,
                priorOdrExperience: priorOdrExperience || null,
                ownerId: req.user.id, // Non-null assertion since middleware guarantees this
            },
            include: { owner: true },
        });
        res.status(201).json(submission);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to submit idea." });
    }
});
// Admin: List all pending idea submissions
adminRouter.get("/submissions", async (req, res) => {
    // Using ensureAdmin middleware means req.user is guaranteed to be defined and have ADMIN role
    const submissions = await prisma_1.default.ideaSubmission.findMany({
        where: { reviewed: false },
        include: { owner: true },
        orderBy: { createdAt: "desc" },
    });
    res.json(submissions);
});
// Admin: Approve an idea submission
adminRouter.post("/submissions/:id/approve", async (req, res) => {
    const { id } = req.params;
    const submission = await prisma_1.default.ideaSubmission.findUnique({ where: { id } });
    if (!submission)
        return res.status(404).json({ error: "Submission not found" });
    // Create Idea from submission
    const idea = await prisma_1.default.idea.create({
        data: {
            title: submission.title,
            caption: submission.caption,
            description: submission.description,
            priorOdrExperience: submission.priorOdrExperience,
            ownerId: submission.ownerId,
            approved: true,
            reviewedAt: new Date(),
            reviewedBy: req.user.id, // Non-null assertion since middleware guarantees this
        },
    });
    // Mark submission as reviewed/approved
    await prisma_1.default.ideaSubmission.update({
        where: { id },
        data: { reviewed: true, approved: true, reviewedAt: new Date(), reviewedBy: req.user.id },
    });
    res.json({ success: true, idea });
});
// Admin: Reject an idea submission
adminRouter.post("/submissions/:id/reject", async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const submission = await prisma_1.default.ideaSubmission.findUnique({ where: { id } });
    if (!submission)
        return res.status(404).json({ error: "Submission not found" });
    await prisma_1.default.ideaSubmission.update({
        where: { id },
        data: {
            reviewed: true,
            approved: false,
            rejected: true,
            rejectionReason: reason || null,
            reviewedAt: new Date(),
            reviewedBy: req.user.id, // Non-null assertion since middleware guarantees this
        },
    });
    res.json({ success: true });
});
// --- EXISTING IDEA ROUTES ---
// List all ideas (admin only)
adminRouter.get("/", async (req, res) => {
    const ideas = await prisma_1.default.idea.findMany({
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
adminRouter.post("/", async (req, res) => {
    const { title, caption, description, priorOdrExperience, ownerId } = req.body;
    if (!title || !description || !ownerId) {
        return res.status(400).json({ error: "Title, description, and ownerId are required." });
    }
    try {
        const idea = await prisma_1.default.idea.create({
            data: {
                title,
                caption: caption || null,
                description,
                priorOdrExperience: priorOdrExperience || null,
                ownerId,
                approved: true,
                reviewedAt: new Date(),
                reviewedBy: req.user.id,
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
    }
    catch (err) {
        res.status(500).json({ error: "Failed to create idea." });
    }
});
// Get all approved ideas (for ODR Lab page)
router.get("/approved", async (req, res) => {
    try {
        const ideas = await prisma_1.default.idea.findMany({
            where: { approved: true },
            include: {
                owner: true,
                likes: true,
                comments: true,
            },
            orderBy: { createdAt: "desc" },
        });
        // Map to frontend format
        const mapped = ideas.map((idea) => ({
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
    }
    catch (err) {
        console.error("[Ideas] Error fetching approved ideas:", err);
        res.status(500).json({ error: "Failed to fetch ideas" });
    }
});
// Get idea details (for discussion board, must be approved)
router.get("/:id", async (req, res) => {
    try {
        const idea = await prisma_1.default.idea.findUnique({
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
    }
    catch (err) {
        console.error("[Ideas] Error fetching idea details:", err);
        res.status(500).json({ error: "Failed to fetch idea details" });
    }
});
// Update idea (owner only)
authenticatedRouter.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { title, caption, description, priorOdrExperience } = req.body;
    const idea = await prisma_1.default.idea.findUnique({ where: { id } });
    if (!idea)
        return res.status(404).json({ error: "Idea not found" });
    if (idea.ownerId !== req.user.id && req.user.userRole !== "ADMIN") {
        return res.status(403).json({ error: "Not authorized" });
    }
    const updated = await prisma_1.default.idea.update({
        where: { id },
        data: { title, caption, description, priorOdrExperience },
    });
    res.json(updated);
});
// Delete idea (owner or admin)
authenticatedRouter.delete("/:id", async (req, res) => {
    const { id } = req.params;
    const idea = await prisma_1.default.idea.findUnique({ where: { id } });
    if (!idea)
        return res.status(404).json({ error: "Idea not found" });
    if (idea.ownerId !== req.user.id && req.user.userRole !== "ADMIN") {
        return res.status(403).json({ error: "Not authorized" });
    }
    await prisma_1.default.idea.delete({ where: { id } });
    res.json({ success: true });
});
// List collaborators
router.get("/:id/collaborators", async (req, res) => {
    const { id } = req.params;
    const collaborators = await prisma_1.default.ideaCollaborator.findMany({
        where: { ideaId: id },
        include: { user: true },
    });
    res.json(collaborators);
});
// Add collaborator
authenticatedRouter.post("/:id/collaborators", async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId)
        return res.status(400).json({ error: "userId required" });
    const collab = await prisma_1.default.ideaCollaborator.create({
        data: { ideaId: id, userId },
    });
    res.status(201).json(collab);
});
// List mentors
router.get("/:id/mentors", async (req, res) => {
    const { id } = req.params;
    const mentors = await prisma_1.default.ideaMentor.findMany({
        where: { ideaId: id },
        include: { user: true },
    });
    res.json(mentors);
});
// Add mentor
authenticatedRouter.post("/:id/mentors", async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId)
        return res.status(400).json({ error: "userId required" });
    const mentor = await prisma_1.default.ideaMentor.create({
        data: { ideaId: id, userId },
    });
    res.status(201).json(mentor);
});
// List comments
router.get("/:id/comments", async (req, res) => {
    const { id } = req.params;
    const comments = await prisma_1.default.comment.findMany({
        where: { ideaId: id },
        include: { user: true, replies: true, likes: true },
        orderBy: { createdAt: "desc" },
    });
    res.json(comments);
});
// Add comment
authenticatedRouter.post("/:id/comments", async (req, res) => {
    const { id } = req.params;
    const { content, parentId } = req.body;
    if (!content)
        return res.status(400).json({ error: "Content required" });
    const comment = await prisma_1.default.comment.create({
        data: {
            content,
            ideaId: id,
            userId: req.user.id,
            parentId: parentId || null,
        },
        include: { user: true, replies: true, likes: true },
    });
    res.status(201).json(comment);
});
// Update like/unlike idea route to match frontend expectations
authenticatedRouter.post("/:id/likes", async (req, res) => {
    const { id } = req.params;
    const { action } = req.body; // 'like' or 'unlike'
    if (!["like", "unlike"].includes(action)) {
        return res.status(400).json({ error: "Invalid action" });
    }
    if (action === "like") {
        const like = await prisma_1.default.like.upsert({
            where: { userId_ideaId: { userId: req.user.id, ideaId: id } },
            update: {},
            create: { userId: req.user.id, ideaId: id },
        });
        return res.json({ liked: true, like });
    }
    else {
        await prisma_1.default.like.deleteMany({
            where: { userId: req.user.id, ideaId: id },
        });
        return res.json({ liked: false });
    }
});
// Add route to check if user has liked an idea
router.get("/:id/likes/check", async (req, res) => {
    const { id } = req.params;
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: "userId is required" });
    }
    const like = await prisma_1.default.like.findUnique({
        where: { userId_ideaId: { userId, ideaId: id } },
    });
    res.json({ liked: !!like });
});
// Add route to get comments liked by a user
router.get("/:id/comments/liked", async (req, res) => {
    const { id } = req.params;
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: "userId is required" });
    }
    const likedComments = await prisma_1.default.like.findMany({
        where: { userId, comment: { ideaId: id } },
        select: { commentId: true },
    });
    res.json({ likedComments: likedComments.map((lc) => lc.commentId) });
});
// Add route for liking/unliking a comment
authenticatedRouter.post("/:id/comments/:commentId/likes", async (req, res) => {
    const { id, commentId } = req.params;
    const { action } = req.body;
    if (!["like", "unlike"].includes(action)) {
        return res.status(400).json({ error: "Invalid action" });
    }
    if (action === "like") {
        await prisma_1.default.like.upsert({
            where: { userId_commentId: { userId: req.user.id, commentId } },
            update: {},
            create: { userId: req.user.id, commentId },
        });
        return res.json({ liked: true });
    }
    else {
        await prisma_1.default.like.deleteMany({
            where: { userId: req.user.id, commentId },
        });
        return res.json({ liked: false });
    }
});
// Mount authenticated and admin routers on the main router
router.use("/", authenticatedRouter);
router.use("/", adminRouter);
exports.default = router;
