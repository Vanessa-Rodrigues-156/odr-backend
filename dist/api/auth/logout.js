"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = logoutHandler;
async function logoutHandler(req, res) {
    // If using cookies, clear the cookie here
    // res.clearCookie("token");
    res.json({ success: true });
}
