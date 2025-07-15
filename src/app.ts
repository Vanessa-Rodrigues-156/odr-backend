import express, {  Response, NextFunction } from "express";
import cors from "cors";
import authRoutes from "./api/auth";
import ideasRoutes from "./api/ideas";
import meetingsRoutes from "./api/meetings";
import errorHandler from "./middleware/errorHandler";
import { authenticateJWT } from "./middleware/auth";
import odrlabsRoutes from "./api/odrlabs";
import discussionRoutes from "./api/discussion";
import adminRoutes from "./api/admin";
import collaborationRoutes from "./api/collaboration";
import chatbotRoutes from "./api/chat";
import mentorsRoutes from "./api/mentors";
import userRoutes from "./api/user";
import securityHeaders from "./middleware/helmet";
import csurf from "csurf";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import contactRoutes from "./api/contact/index";


const app = express();
// Trust first proxy (needed for correct client IP with X-Forwarded-For headers)
app.set('trust proxy', 1);

// --- CSP Nonce Middleware ---
app.use((req: Request, res: Response, next: NextFunction) => {
  const nonce = crypto.randomBytes(16).toString("base64");
  res.locals.nonce = nonce;
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src * blob: data:",
      "connect-src *",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("x-nonce", nonce); // Pass nonce to Next.js SSR
  next();
});

// Apply industry-standard HTTP security headers
app.use(securityHeaders); // Helmet: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS

app.use(
  cors({
    origin: [
      "https://odrlab.com",
      "https://www.odrlab.com",
      "https://api.odrlab.com",
      "http://localhost:3000",
      "https://odrlab.netlify.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
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
      origin === "https://api.odrlab.com" ||
      origin === "http://localhost:3000" ||
      origin === "https://odrlab.netlify.app"
    ) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-csrf-token");
    res.header("Access-Control-Allow-Credentials", "true");
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// CSRF protection setup - less restrictive for development
app.use(cookieParser());
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    secure: process.env.NODE_ENV === "production",
  },
  ignoreMethods: ["GET", "HEAD", "OPTIONS"],
  // Skip CSRF for development to prevent issues
  value: (req) => {
    if (process.env.NODE_ENV !== "production") {
      // In development, be more lenient with CSRF
      return req.get('x-csrf-token') || req.body._csrf || req.query._csrf || 'dev-bypass';
    }
    return req.get('x-csrf-token') || req.body._csrf || req.query._csrf;
  }
});

// Expose CSRF token to frontend via endpoint (simplified)
app.get("/api/csrf-token", (req, res) => {
  // In development, always provide a token
  if (process.env.NODE_ENV !== "production") {
    return res.json({ csrfToken: "dev-token" });
  }
  
  // In production, use proper CSRF protection
  csrfProtection(req, res, () => {
    res.json({ csrfToken: req.csrfToken ? req.csrfToken() : null });
  });
});

// Apply CSRF protection more selectively
app.use((req, res, next) => {
  // Skip CSRF for auth routes and public APIs
  if (
    req.path.startsWith("/api/auth/") ||
    req.path.startsWith("/api/public/") ||
    req.path === "/api/csrf-token" ||
    process.env.NODE_ENV !== "production"
  ) {
    return next();
  }
  
  // Only apply CSRF to state-changing requests on protected endpoints
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
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
app.use("/api/admin", authenticateJWT, adminRoutes);
app.use("/api/collaboration", authenticateJWT, collaborationRoutes);
app.use("/api/mentors", authenticateJWT, mentorsRoutes);
// Add the user routes with authentication middleware
app.use("/api/user", authenticateJWT, userRoutes);
app.use("/api/contact", contactRoutes);

app.use(errorHandler);

// Add type for csrfToken to Request
import { Request } from "express";
declare module "express-serve-static-core" {
  interface Request {
    csrfToken?: () => string;
  }
}

export default app;
