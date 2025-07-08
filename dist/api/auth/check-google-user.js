"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = checkGoogleUserHandler;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../../lib/prisma"));
function sanitizeString(str) {
    return str.replace(/<script.*?>.*?<\/script>/gi, "").replace(/[<>]/g, "");
}
const checkGoogleUserSchema = zod_1.z.object({
    email: zod_1.z.string().email().max(200).transform((v) => sanitizeString(v)),
    name: zod_1.z.string().min(2).max(100).transform((v) => sanitizeString(v)),
    imageAvatar: zod_1.z.string().url().max(300).optional().nullable().transform((v) => (v ? sanitizeString(v) : v)),
});
async function checkGoogleUserHandler(req, res) {
    try {
        // Validate and sanitize input
        const parseResult = checkGoogleUserSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
        }
        const { email, name, imageAvatar } = parseResult.data; // Include imageAvatar URL
        // Check if user already exists by email
        const existingUser = await prisma_1.default.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: {
                innovator: true,
                mentor: true,
                faculty: true,
                other: true
            }
        });
        if (existingUser) {
            return res.json({
                isNewUser: false,
                user: existingUser,
                needsProfileCompletion: !existingUser.contactNumber // Check if profile is complete
            });
        }
        else {
            // Create basic user record for Google sign-up with role-specific record
            const newUser = await prisma_1.default.$transaction(async (prisma) => {
                const user = await prisma.user.create({
                    data: {
                        name,
                        email: email.toLowerCase().trim(),
                        imageAvatar: imageAvatar || null, // Store the image URL
                        userRole: "INNOVATOR", // Default role
                        password: null, // No password for Google users
                    }
                });
                // Create corresponding Innovator record since default role is INNOVATOR
                await prisma.innovator.create({
                    data: {
                        userId: user.id,
                    }
                });
                return user;
            });
            return res.json({
                isNewUser: true,
                user: newUser,
                needsProfileCompletion: true
            });
        }
    }
    catch (error) {
        console.error("Error checking Google user:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
