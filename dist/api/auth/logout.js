"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = logoutHandler;
async function logoutHandler(req, res) {
    // Clear auth cookies
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/" });
    res.json({ success: true });
}
