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
function requireAdmin(req, res, next) {
    if (req.user?.userRole !== "ADMIN") {
        return res.status(403).json({ error: "Admin access required" });
    }
    next();
}
// Platform summary
router.get("/summary", requireAdmin, async (req, res) => {
    const [userCount, ideaCount, commentCount, likeCount] = await Promise.all([
        prisma_1.default.user.count(),
        prisma_1.default.idea.count(),
        prisma_1.default.comment.count(),
        prisma_1.default.like.count(),
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
    const activity = await Promise.all(weeks.map(async ({ start, end }) => {
        const count = await prisma_1.default.idea.count({
            where: {
                createdAt: { gte: end, lt: start },
            },
        });
        return { weekStart: end, weekEnd: start, count };
    }));
    res.json(activity.reverse());
});
exports.default = router;
