"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = googleSignInHandler;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
async function googleSignInHandler(req, res) {
    try {
        const { email, name } = req.body;
        if (!email || !name) {
            return res.status(400).json({ error: "Email and name are required" });
        }
        console.log(`Google sign-in attempt for email: ${email}`);
        // Check if user exists with related profiles
        let user = await prisma_1.default.user.findUnique({
            where: { email },
            include: {
                innovator: true,
                mentor: true,
                faculty: true,
                other: true,
            }
        });
        let needsProfileCompletion = false;
        if (!user) {
            // Create new user with minimal information
            user = await prisma_1.default.$transaction(async (prisma) => {
                const newUser = await prisma.user.create({
                    data: {
                        email,
                        name,
                        userRole: "INNOVATOR", // Default role
                    },
                });
                // Create corresponding Innovator record
                await prisma.innovator.create({
                    data: {
                        userId: newUser.id,
                    }
                });
                return prisma.user.findUnique({
                    where: { id: newUser.id },
                    include: {
                        innovator: true,
                        mentor: true,
                        faculty: true,
                        other: true,
                    }
                });
            });
            needsProfileCompletion = true;
            console.log(`New user created from Google sign-in: ${email}`);
        }
        else if (!user.contactNumber || !user.city || !user.country) {
            // If user exists but profile is incomplete
            needsProfileCompletion = true;
            console.log(`Existing user with incomplete profile: ${email}`);
        }
        // Ensure TypeScript knows user is not null here
        if (!user) {
            return res.status(500).json({ error: "Failed to create or retrieve user" });
        }
        // Create JWT token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("JWT_SECRET is not configured!");
            return res.status(500).json({ error: "Server configuration error" });
        }
        // Generate token if profile is complete
        let token = null;
        if (!needsProfileCompletion) {
            token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, userRole: user.userRole }, jwtSecret, { expiresIn: "7d" });
            console.log(`Google sign-in successful with complete profile for: ${email}`);
        }
        else {
            console.log(`Google sign-in successful, profile completion needed for: ${email}`);
        }
        // Prepare role-specific data for the response
        let roleSpecificData = {};
        if (user.userRole === "INNOVATOR" && user.innovator) {
            roleSpecificData = {
                institution: user.innovator.institution,
                highestEducation: user.innovator.highestEducation,
                courseName: user.innovator.courseName,
                courseStatus: user.innovator.courseStatus,
            };
        }
        else if (user.userRole === "MENTOR" && user.mentor) {
            roleSpecificData = {
                mentorType: user.mentor.mentorType,
                organization: user.mentor.organization,
            };
        }
        else if (user.userRole === "FACULTY" && user.faculty) {
            roleSpecificData = {
                institution: user.faculty.institution,
            };
        }
        // Return appropriate response based on profile completion status
        return res.status(200).json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                userRole: user.userRole,
                contactNumber: user.contactNumber,
                city: user.city,
                country: user.country,
                createdAt: user.createdAt,
                ...roleSpecificData,
            },
            needsProfileCompletion,
            token,
            message: needsProfileCompletion
                ? "Profile completion required"
                : "Sign in successful",
        });
    }
    catch (error) {
        console.error("Google sign-in error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
