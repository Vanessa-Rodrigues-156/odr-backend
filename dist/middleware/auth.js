"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = exports.authenticateJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const authenticateJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : null;
        if (!token) {
            console.log("No token provided");
            return res.status(401).json({ error: "Access token required" });
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("JWT_SECRET is not configured!");
            return res.status(500).json({ error: "Server configuration error" });
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        // Debug: Log the decoded token to see what's in it
        console.log("Decoded JWT payload:", decoded);
        // Extract user ID from different possible field names
        const userId = decoded.id || decoded.userId || decoded.sub;
        // Check if decoded token has a valid user ID field
        if (!userId) {
            console.error("JWT token missing user ID field. Available fields:", Object.keys(decoded));
            return res.status(401).json({
                error: "Invalid token format - missing user ID",
            });
        }
        req.jwtPayload = decoded;
        // Update user lookup to include role-specific models
        const user = await prisma_1.default.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                id: true,
                name: true,
                email: true,
                userRole: true,
                contactNumber: true,
                city: true,
                country: true,
                createdAt: true,
                // Include role-specific models
                innovator: true,
                mentor: true,
                faculty: true,
                other: true,
            },
        });
        if (!user) {
            console.log(`User not found for id: ${userId}`);
            return res.status(401).json({ error: "User not found" });
        }
        // Add role-specific data to user object before setting req.user
        let roleData = {};
        if (user.userRole === "INNOVATOR" && user.innovator) {
            roleData = {
                institution: user.innovator.institution,
                highestEducation: user.innovator.highestEducation,
                courseName: user.innovator.courseName,
                courseStatus: user.innovator.courseStatus,
                description: user.innovator.description,
            };
        }
        else if (user.userRole === "MENTOR" && user.mentor) {
            roleData = {
                mentorType: user.mentor.mentorType,
                organization: user.mentor.organization,
                role: user.mentor.role,
                expertise: user.mentor.expertise,
                description: user.mentor.description,
            };
        }
        else if (user.userRole === "FACULTY" && user.faculty) {
            roleData = {
                institution: user.faculty.institution,
                role: user.faculty.role,
                expertise: user.faculty.expertise,
                course: user.faculty.course,
                mentoring: user.faculty.mentoring,
                description: user.faculty.description,
            };
        }
        else if (user.userRole === "OTHER" && user.other) {
            roleData = {
                role: user.other.role,
                workplace: user.other.workplace,
                description: user.other.description,
            };
        }
        // Merge base user data with role-specific data
        req.user = {
            ...user,
            ...roleData,
        };
        next();
    }
    catch (err) {
        console.error("JWT verification error:", err.message);
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token expired" });
        }
        if (err.name === "JsonWebTokenError") {
            return res.status(401).json({ error: "Invalid token" });
        }
        return res.status(401).json({ error: "Authentication failed" });
    }
};
exports.authenticateJWT = authenticateJWT;
const generateToken = async (user) => {
    // Check if the user is a mentor and get their approval status
    let isMentorApproved = false;
    if (user.userRole === "MENTOR" && user.mentor) {
        isMentorApproved = !!user.mentor.approved;
    }
    return jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email,
        userRole: user.userRole,
        isMentorApproved, // Include in the token
    }, process.env.JWT_SECRET || "your-secret-key", { expiresIn: "24h" });
};
exports.generateToken = generateToken;
