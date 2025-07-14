"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const login_1 = __importDefault(require("./login"));
const signup_1 = __importDefault(require("./signup"));
const session_1 = __importDefault(require("./session"));
const debug_1 = __importDefault(require("./debug"));
const google_signin_1 = __importDefault(require("./google-signin"));
const complete_profile_1 = __importDefault(require("./complete-profile"));
const check_google_user_1 = __importDefault(require("./check-google-user"));
const refresh_token_1 = __importDefault(require("./refresh-token"));
const auth_1 = require("../../middleware/auth");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = express_1.default.Router();
// Rate limiters - more reasonable limits for development and testing
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === "production" ? 5 : 50, // More lenient in development
    message: { error: "Too many requests, please try again after a minute." },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for development
        return process.env.NODE_ENV !== "production";
    }
});
// Public routes - no authentication required
router.post("/login", authLimiter, login_1.default);
router.post("/signup", authLimiter, signup_1.default);
router.post("/google-signin", google_signin_1.default);
router.post("/complete-profile", authLimiter, complete_profile_1.default);
router.post("/check-google-user", check_google_user_1.default);
router.post("/refresh-token", refresh_token_1.default);
// Protected routes - require authentication
router.get("/session", auth_1.authenticateJWT, session_1.default);
// Debug route - only available in non-production
if (process.env.NODE_ENV !== "production") {
    router.get("/debug", auth_1.authenticateJWT, debug_1.default);
}
exports.default = router;
