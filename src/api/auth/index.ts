import express from "express";
import loginHandler from "./login";
import signupHandler from "./signup";
import sessionHandler from "./session";
import debugAuthHandler from "./debug";
import googleSignInHandler from "./google-signin";
import completeProfileHandler from "./complete-profile";
import checkGoogleUserHandler from "./check-google-user";
import refreshTokenHandler from "./refresh-token";
import logoutHandler from "./logout";
import { authenticateJWT } from "../../middleware/auth";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiters - more reasonable limits for development and testing
const authLimiter = rateLimit({
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
router.post("/login", authLimiter, loginHandler);
router.post("/signup", authLimiter, signupHandler);
router.post("/google-signin", googleSignInHandler);
router.post("/complete-profile", authLimiter, completeProfileHandler);
router.post("/check-google-user", checkGoogleUserHandler);
router.post("/refresh-token", refreshTokenHandler);
router.post("/logout", logoutHandler);

// Protected routes - require authentication
router.get("/session", authenticateJWT, sessionHandler);

// Debug route - only available in non-production
if (process.env.NODE_ENV !== "production") {
  router.get("/debug", authenticateJWT, debugAuthHandler);
}

export default router;
