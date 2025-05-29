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
// List all users (no password)
router.get("/", requireAdmin, async (req, res) => {
    const users = await prisma_1.default.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            userRole: true,
            contactNumber: true,
            city: true,
            country: true,
            institution: true,
            highestEducation: true,
            odrLabUsage: true,
            createdAt: true,
        },
    });
    res.json(users);
});
// Get user by id
router.get("/:id", requireAdmin, async (req, res) => {
    const user = await prisma_1.default.user.findUnique({
        where: { id: req.params.id },
        select: {
            id: true,
            name: true,
            email: true,
            userRole: true,
            contactNumber: true,
            city: true,
            country: true,
            institution: true,
            highestEducation: true,
            odrLabUsage: true,
            createdAt: true,
        },
    });
    if (!user)
        return res.status(404).json({ error: "User not found" });
    res.json(user);
});
// Update user (role or info)
router.put("/:id", requireAdmin, async (req, res) => {
    const { name, userRole, contactNumber, city, country, institution, highestEducation, odrLabUsage, } = req.body;
    const user = await prisma_1.default.user.update({
        where: { id: req.params.id },
        data: {
            name,
            userRole,
            contactNumber,
            city,
            country,
            institution,
            highestEducation,
            odrLabUsage,
        },
    });
    res.json({ success: true, user });
});
// Delete user
router.delete("/:id", requireAdmin, async (req, res) => {
    await prisma_1.default.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
});
// Get user by email (for testing password)
router.get("/email/:email", async (req, res) => {
    const { email } = req.params;
    const user = await prisma_1.default.user.findUnique({
        where: { email },
        select: {
            id: true,
            name: true,
            email: true,
            password: true, // Make sure to include this, this was put due to an error in login 
            userRole: true,
            contactNumber: true,
            city: true,
            country: true,
            institution: true,
            highestEducation: true,
            odrLabUsage: true,
            createdAt: true,
        },
    });
    if (!user)
        return res.status(404).json({ error: "User not found" });
    res.json(user);
});
exports.default = router;
