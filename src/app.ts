import express from "express";
import cors from "cors";
import authRoutes from "./api/auth";
import ideasRoutes from "./api/ideas";
import meetingsRoutes from "./api/meetings";
import errorHandler from "./middleware/errorHandler";
import { authenticateJWT } from "./middleware/auth";
import odrlabsRoutes from "./api/odrlabs";
import submitIdeaRoutes from "./api/submit-idea";
import discussionRoutes from "./api/discussion";
import adminRoutes from "./api/admin";
import collaborationRoutes from "./api/collaboration";
import chatbotRoutes from "./api/chat";
import mentorsRoutes from "./api/mentors";
// Import the user routes
import userRoutes from "./api/user";
import securityHeaders from "./middleware/helmet";
import csurf from "csurf";
import cookieParser from "cookie-parser";

const app = express();

// Apply industry-standard HTTP security headers
app.use(securityHeaders); // Helmet: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS

app.use(
  cors({
    origin: [
      "https://odrlab.com",
      "https://www.odrlab.com",
      "https://api.odrlab.com",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
// Explicitly handle preflight OPTIONS requests for all routes
app.options("*", cors());

// Manual fallback for OPTIONS requests (for maximum compatibility)
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.origin;
    if (
      origin === "https://odrlab.com" ||
      origin === "https://www.odrlab.com" ||
      origin === "https://api.odrlab.com"
    ) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// CSRF protection setup
app.use(cookieParser());
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    secure: process.env.NODE_ENV === "production",
  },
  ignoreMethods: ["GET", "HEAD", "OPTIONS"],
});

// Expose CSRF token to frontend via endpoint
app.get("/api/csrf-token", csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken ? req.csrfToken() : null });
});

// Apply CSRF protection to all state-changing API routes (after CORS, before routes)
app.use((req, res, next) => {
  // Only protect authenticated API routes (not public APIs)
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
    req.path.startsWith("/api/") &&
    !req.path.startsWith("/api/auth/") &&
    !req.path.startsWith("/api/public/")
  ) {
    return csrfProtection(req, res, next);
  }
  next();
});

app.use("/api/chat", chatbotRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/ideas", authenticateJWT, ideasRoutes);
app.use("/api/meetings", authenticateJWT, meetingsRoutes);
// Protect ODR Lab and Discussion routes
app.use("/api/odrlabs", authenticateJWT, odrlabsRoutes);
app.use("/api/discussion", authenticateJWT, discussionRoutes);
app.use("/api/submit-idea", authenticateJWT, submitIdeaRoutes);
app.use("/api/admin", authenticateJWT, adminRoutes);
app.use("/api/collaboration", authenticateJWT, collaborationRoutes);
app.use("/api/mentors", authenticateJWT, mentorsRoutes);
// Add the user routes with authentication middleware
app.use("/api/user", authenticateJWT, userRoutes);

app.use(errorHandler);

// Add type for csrfToken to Request
import { Request } from "express";
declare module "express-serve-static-core" {
  interface Request {
    csrfToken?: () => string;
  }
}

export default app;
