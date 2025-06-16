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
// Apply authentication middleware to authenticated router
authenticatedRouter.use(ensureAuthenticated);
// Get all comments for an idea
router.get("/:ideaId/comments", async (req, res) => {
    const { ideaId } = req.params;
    const comments = await prisma_1.default.comment.findMany({
        where: { ideaId },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, email: true } } }, // Changed from user to author
    });
    res.json(comments);
});
// Add a comment to an idea - requires authentication
authenticatedRouter.post("/:ideaId/comments", async (req, res) => {
    const { ideaId } = req.params;
    const { content } = req.body;
    if (!content)
        return res.status(400).json({ error: "Content required" });
    const comment = await prisma_1.default.comment.create({
        data: {
            content,
            ideaId,
            authorId: req.user.id, // Changed from userId to authorId
        },
    });
    res.status(201).json(comment);
});
// Like/unlike an idea - requires authentication
authenticatedRouter.post("/:ideaId/likes", async (req, res) => {
    const { ideaId } = req.params;
    const { action } = req.body; // 'like' or 'unlike'
    const userId = req.user.id;
    if (action === "like") {
        const like = await prisma_1.default.like.upsert({
            where: {
                userId_ideaId: {
                    userId,
                    ideaId
                }
            },
            update: {},
            create: { userId, ideaId },
        });
        return res.json({ liked: true });
    }
    else if (action === "unlike") {
        await prisma_1.default.like.deleteMany({
            where: { userId, ideaId },
        });
        return res.json({ liked: false });
    }
    else {
        return res.status(400).json({ error: "Invalid action. Use 'like' or 'unlike'" });
    }
});
// Check if user liked the idea - requires authentication
authenticatedRouter.get("/:ideaId/likes/check", async (req, res) => {
    const { ideaId } = req.params;
    const userId = req.user.id;
    const like = await prisma_1.default.like.findUnique({
        where: {
            userId_ideaId: {
                userId,
                ideaId
            }
        },
    });
    res.json({ hasLiked: !!like });
});
// Get liked comments for a user on an idea - requires authentication
authenticatedRouter.get("/:ideaId/comments/liked", async (req, res) => {
    const { ideaId } = req.params;
    const userId = req.user.id; // Non-null assertion since middleware guarantees this
    const likedComments = await prisma_1.default.like.findMany({
        where: { userId, comment: { ideaId } },
        select: { commentId: true },
    });
    res.json({ likedCommentIds: likedComments.map((lc) => lc.commentId) });
});
// Add route for liking/unliking a specific comment to match frontend
authenticatedRouter.post("/:ideaId/comments/:commentId/likes", async (req, res) => {
    const { commentId } = req.params;
    const { action } = req.body;
    const userId = req.user.id;
    if (action === "like") {
        await prisma_1.default.like.upsert({
            where: {
                userId_commentId: {
                    userId,
                    commentId
                }
            },
            update: {},
            create: { userId, commentId },
        });
        return res.json({ liked: true });
    }
    else if (action === "unlike") {
        await prisma_1.default.like.deleteMany({
            where: { userId, commentId },
        });
        return res.json({ liked: false });
    }
    else {
        return res.status(400).json({ error: "Invalid action. Use 'like' or 'unlike'" });
    }
});
// Mount authenticated router on the main router
router.use("/", authenticatedRouter);
exports.default = router;
