"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticateJWT);
// GET /odrlabs/ideas - List all approved ideas for ODR Labs page
router.get("/ideas", async (req, res) => {
    try {
        const ideas = await prisma_1.default.idea.findMany({
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
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch ideas" });
    }
});
exports.default = router;
