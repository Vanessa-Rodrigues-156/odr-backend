"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const login_1 = __importDefault(require("./login"));
const signup_1 = __importDefault(require("./signup"));
const session_1 = __importDefault(require("./session"));
const logout_1 = __importDefault(require("./logout"));
const debug_1 = __importDefault(require("./debug"));
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// Standard auth endpoints
router.post("/login", login_1.default);
router.post("/signup", signup_1.default);
router.get("/session", auth_1.authenticateJWT, session_1.default);
router.post("/logout", logout_1.default); // Optional, for cookie-based JWT
// Debug endpoint - only enabled in development
if (process.env.NODE_ENV !== "production") {
    router.get("/debug", auth_1.authenticateJWT, debug_1.default);
    console.log("Auth debug endpoint enabled at /api/auth/debug");
}
exports.default = router;
