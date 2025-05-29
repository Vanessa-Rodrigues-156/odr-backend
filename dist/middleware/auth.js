"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateJWT = authenticateJWT;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
function authenticateJWT(req, res, next) {
    console.log("Authenticating request to:", req.path);
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.log("No Bearer token provided");
        return res.status(401).json({ error: "Authentication required" });
    }
    const token = authHeader.split(" ")[1];
    try {
        // Verify the token
        const jwtPayload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Set the JWT payload on the request
        req.jwtPayload = jwtPayload;
        // Fetch the complete user from the database
        prisma_1.default.user.findUnique({
            where: { id: jwtPayload.id },
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
        })
            .then(user => {
            if (!user) {
                console.log(`User not found for token with id: ${jwtPayload.id}`);
                return res.status(401).json({ error: "User not found" });
            }
            // Set the user on the request - user object from database matches our AuthUser interface now
            req.user = user;
            console.log(`Authenticated user: ${user.email} with role: ${user.userRole}`);
            next();
        })
            .catch(err => {
            console.error("Database error in auth middleware:", err);
            return res.status(500).json({ error: "Internal server error" });
        });
    }
    catch (err) {
        console.error("JWT verification error:", err);
        if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
                return res.status(401).json({ error: "Token expired" });
            }
            else {
                return res.status(401).json({ error: "Invalid token" });
            }
        }
        return res.status(401).json({ error: "Authentication failed" });
    }
}
