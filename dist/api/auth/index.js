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
const auth_1 = require("../../middleware/auth");
const router = express_1.default.Router();
// Public routes - no authentication required
router.post("/login", login_1.default);
router.post("/signup", signup_1.default);
router.post("/google-signin", google_signin_1.default);
router.post("/complete-profile", complete_profile_1.default);
// Protected routes - require authentication
router.get("/session", auth_1.authenticateJWT, session_1.default);
// Debug route - only available in non-production
if (process.env.NODE_ENV !== "production") {
    router.get("/debug", auth_1.authenticateJWT, debug_1.default);
}
exports.default = router;
