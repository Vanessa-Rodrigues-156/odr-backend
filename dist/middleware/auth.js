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
        // Get token from Authorization header (primary method)
        let token = null;
        const authHeader = req.headers.authorization;
        console.log("[JWT] Incoming Authorization header:", authHeader);
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }
        // Fallback to cookie if no Bearer token
        if (!token) {
            token = req.cookies?.access_token;
            if (token) {
                console.log("[JWT] Using token from cookie");
            }
        }
        if (!token) {
            console.warn("[JWT] No access token found in Authorization header or cookie");
            return res.status(401).json({ error: "Access token required" });
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("JWT_SECRET is not configured!");
            return res.status(500).json({ error: "Server configuration error" });
        }
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        }
        catch (err) {
            console.error("[JWT] Token verification failed:", err.message);
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({ error: "Token expired" });
            }
            if (err.name === "JsonWebTokenError") {
                return res.status(401).json({ error: "Invalid or malformed token" });
            }
            return res.status(401).json({ error: "Authentication failed" });
        }
        // Extract user ID from token
        const userId = decoded.id || decoded.userId || decoded.sub;
        if (!userId) {
            console.warn("[JWT] Token decoded but missing user ID field:", decoded);
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
            console.log(`[JWT] User not found for id: ${userId}`);
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
        // Check for mentor application status - this is important for showing pending status
        let hasMentorApplication = false;
        let isMentorApproved = false;
        let mentorRejectionReason = null;
        // If user is already a MENTOR, they're approved
        if (user.userRole === "MENTOR" && user.mentor) {
            hasMentorApplication = true;
            isMentorApproved = user.mentor.approved;
            mentorRejectionReason = user.mentor.rejectionReason;
        }
        // If user is OTHER but has a mentor record, they have a pending application
        else if (user.userRole === "OTHER" && user.mentor) {
            hasMentorApplication = true;
            isMentorApproved = user.mentor.approved;
            mentorRejectionReason = user.mentor.rejectionReason;
        }
        // Merge base user data with role-specific data and mentor status
        req.user = {
            ...user,
            ...roleData,
            hasMentorApplication,
            isMentorApproved,
            mentorRejectionReason
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
    // Check if the user has applied for mentor (regardless of current role) and get approval status
    let isMentorApproved = false;
    let mentorRejectionReason = null;
    let hasMentorApplication = false;
    if (user.mentor) {
        hasMentorApplication = true;
        isMentorApproved = !!user.mentor.approved;
        // Include rejection reason if present
        mentorRejectionReason = user.mentor.rejectionReason || null;
    }
    return jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email,
        userRole: user.userRole,
        hasMentorApplication,
        isMentorApproved,
        mentorRejectionReason, // Include rejection reason if application was rejected
    }, process.env.JWT_SECRET || "your-secret-key", { expiresIn: "24h" });
};
exports.generateToken = generateToken;
