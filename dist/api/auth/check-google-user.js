"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = checkGoogleUserHandler;
const prisma_1 = __importDefault(require("../../lib/prisma"));
async function checkGoogleUserHandler(req, res) {
    try {
        const { email, name } = req.body; // Exclude image as it's not stored
        if (!email || !name) {
            return res.status(400).json({ error: "Missing required fields" });
        }
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
