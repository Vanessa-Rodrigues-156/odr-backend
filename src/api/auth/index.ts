import { Router } from "express";
import loginHandler from "./login";
import signupHandler from "./signup";
import sessionHandler from "./session";
import logoutHandler from "./logout";
import debugAuthHandler from "./debug";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();

// Standard auth endpoints
router.post("/login", loginHandler);
router.post("/signup", signupHandler);
router.get("/session", authenticateJWT, sessionHandler);
router.post("/logout", logoutHandler); // Optional, for cookie-based JWT

// Debug endpoint - only enabled in development
if (process.env.NODE_ENV !== "production") {
  router.get("/debug", authenticateJWT, debugAuthHandler);
  console.log("Auth debug endpoint enabled at /api/auth/debug");
}

export default router;
