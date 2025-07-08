"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = refreshTokenHandler;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Helper to get cookie options
function getCookieOptions(isRefresh = false) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        ...(isRefresh ? { maxAge: 7 * 24 * 60 * 60 * 1000 } : { maxAge: 15 * 60 * 1000 })
    };
}
async function refreshTokenHandler(req, res) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return res.status(500).json({ error: "Server configuration error" });
    }
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
        return res.status(401).json({ error: "Refresh token missing" });
    }
    try {
        const payload = jsonwebtoken_1.default.verify(refreshToken, jwtSecret);
        // Issue new access token
        const accessToken = jsonwebtoken_1.default.sign({ id: payload.id, email: payload.email, userRole: payload.userRole }, jwtSecret, { expiresIn: "15m" });
        res.cookie("access_token", accessToken, getCookieOptions());
        return res.status(200).json({ success: true });
    }
    catch (err) {
        return res.status(401).json({ error: "Invalid or expired refresh token" });
    }
}
