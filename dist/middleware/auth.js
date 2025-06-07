"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const authenticateJWT = async (req, res, next) => {
    console.log("Authenticating request to:", req.path);
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        return next(); // Allow unauthenticated requests to pass through
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "fallback-secret");
        req.jwtPayload = decoded;
        const user = await prisma_1.default.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
                userRole: true,
                country: true,
                institution: true,
                city: true,
                highestEducation: true,
                contactNumber: true,
                odrLabUsage: true,
                createdAt: true,
            },
        });
        if (user) {
            req.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                userRole: user.userRole,
                country: user.country || undefined,
                institution: user.institution || undefined,
                city: user.city || undefined,
                highestEducation: user.highestEducation || undefined,
                contactNumber: user.contactNumber || undefined,
                odrLabUsage: user.odrLabUsage || undefined,
                createdAt: user.createdAt,
            };
        }
    }
    catch (err) {
        // Invalid token, but don't block the request
        console.warn("Invalid JWT token:", err.message);
    }
    next();
};
exports.authenticateJWT = authenticateJWT;
