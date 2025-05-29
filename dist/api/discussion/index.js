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
        include: { user: { select: { id: true, name: true, email: true } } },
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
            userId: req.user.id, // Non-null assertion since middleware guarantees this
        },
    });
    res.status(201).json(comment);
});
// Like/unlike an idea - requires authentication
authenticatedRouter.post("/:ideaId/like", async (req, res) => {
    const { ideaId } = req.params;
    const userId = req.user.id; // Non-null assertion since middleware guarantees this
    const like = await prisma_1.default.like.findUnique({
        where: { userId_ideaId: { userId, ideaId } },
    });
    if (like) {
        await prisma_1.default.like.delete({ where: { userId_ideaId: { userId, ideaId } } });
        return res.json({ liked: false });
    }
    else {
        await prisma_1.default.like.create({ data: { userId, ideaId } });
        return res.json({ liked: true });
    }
});
// Check if user liked the idea - requires authentication
authenticatedRouter.get("/:ideaId/like/check", async (req, res) => {
    const { ideaId } = req.params;
    const userId = req.user.id; // Non-null assertion since middleware guarantees this
    const like = await prisma_1.default.like.findUnique({
        where: { userId_ideaId: { userId, ideaId } },
    });
    res.json({ hasLiked: !!like });
});
// Get liked comments for a user on an idea - requires authentication
authenticatedRouter.get("/:ideaId/comments/likes", async (req, res) => {
    const { ideaId } = req.params;
    const userId = req.user.id; // Non-null assertion since middleware guarantees this
    const likedComments = await prisma_1.default.like.findMany({
        where: { userId, comment: { ideaId } },
        select: { commentId: true },
    });
    res.json({ likedCommentIds: likedComments.map((lc) => lc.commentId) });
});
// Mount authenticated router on the main router
router.use("/", authenticatedRouter);
exports.default = router;
