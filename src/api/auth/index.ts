import express from "express";
import loginHandler from "./login";
import signupHandler from "./signup";
import sessionHandler from "./session";
import debugAuthHandler from "./debug";
import googleSignInHandler from "./google-signin";
import completeProfileHandler from "./complete-profile";
import checkGoogleUserHandler from "./check-google-user";
import { authenticateJWT } from "../../middleware/auth";

const router = express.Router();

// Public routes - no authentication required
router.post("/login", loginHandler);
router.post("/signup", signupHandler);
router.post("/google-signin", googleSignInHandler);
router.post("/complete-profile", completeProfileHandler);
router.post("/check-google-user", checkGoogleUserHandler);

// Protected routes - require authentication
router.get("/session", authenticateJWT, sessionHandler);

// Debug route - only available in non-production
if (process.env.NODE_ENV !== "production") {
  router.get("/debug", authenticateJWT, debugAuthHandler);
}

export default router;
