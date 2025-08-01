"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = (0, express_1.Router)();
// Create an authenticated router for routes that require login
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
// Apply authentication middleware to authenticatedRouter
authenticatedRouter.use(ensureAuthenticated);
// Rate limiter for form submissions (20 requests per 10 minutes)
const formLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 20,
    message: { error: "Too many form submissions, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});
// Submit a new idea (pending approval)
authenticatedRouter.post("/", formLimiter, async (req, res) => {
    const { title, idea_caption, description, odr_experience, consent } = req.body;
    if (!title || !description || !odr_experience || !consent) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    try {
        // req.user is guaranteed to be defined because of ensureAuthenticated middleware
        const idea = await prisma_1.default.ideaSubmission.create({
            data: {
                title,
                caption: idea_caption || null,
                description,
                priorOdrExperience: odr_experience || null,
                ownerId: req.user.id,
                approved: false,
            },
        });
        res.status(201).json({
            success: true,
            message: "Idea submitted successfully and awaiting approval",
            ideaId: idea.id,
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to submit idea. Please try again later.",
        });
    }
});
// Mount authenticated router on the main router
router.use("/", authenticatedRouter);
exports.default = router;
