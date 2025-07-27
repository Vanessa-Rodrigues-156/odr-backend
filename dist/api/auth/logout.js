"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = logoutHandler;
const auth_utils_1 = require("../../lib/auth-utils");
async function logoutHandler(req, res) {
    try {
        // Clear all authentication cookies using the robust utility
        (0, auth_utils_1.clearAuthCookies)(res);
        console.log("User logout successful - all auth cookies cleared");
        return res.status(200).json({
            success: true,
            message: "Logout successful"
        });
    }
    catch (error) {
        console.error("Error during logout:", error);
        // Even if there's an error, try to clear cookies manually as fallback
        res.clearCookie("access_token", { path: "/" });
        res.clearCookie("refresh_token", { path: "/" });
        res.clearCookie("odrindia_session", { path: "/" });
        return res.status(500).json({
            success: false,
            error: "Logout failed, but cookies cleared"
        });
    }
}
