"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./api/auth"));
const ideas_1 = __importDefault(require("./api/ideas"));
const meetings_1 = __importDefault(require("./api/meetings"));
const errorHandler_1 = __importDefault(require("./middleware/errorHandler"));
const auth_2 = require("./middleware/auth");
const odrlabs_1 = __importDefault(require("./api/odrlabs"));
const discussion_1 = __importDefault(require("./api/discussion"));
const admin_1 = __importDefault(require("./api/admin"));
const collaboration_1 = __importDefault(require("./api/collaboration"));
const chat_1 = __importDefault(require("./api/chat"));
const mentors_1 = __importDefault(require("./api/mentors"));
const user_1 = __importDefault(require("./api/user"));
const helmet_1 = __importDefault(require("./middleware/helmet"));
const csurf_1 = __importDefault(require("csurf"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const crypto_1 = __importDefault(require("crypto"));
const index_1 = __importDefault(require("./api/contact/index"));
const app = (0, express_1.default)();
// Trust first proxy (needed for correct client IP with X-Forwarded-For headers)
app.set('trust proxy', 1);
// --- CSP Nonce Middleware ---
app.use((req, res, next) => {
    const nonce = crypto_1.default.randomBytes(16).toString("base64");
    res.locals.nonce = nonce;
    res.setHeader("Content-Security-Policy", [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}'${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ""}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src * blob: data:",
        "connect-src *",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
    ].join('; '));
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("x-nonce", nonce); // Pass nonce to Next.js SSR
    next();
});
// Apply industry-standard HTTP security headers
app.use(helmet_1.default); // Helmet: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS
app.use((0, cors_1.default)({
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
}));
// Explicitly handle preflight OPTIONS requests for all routes
app.options("*", (0, cors_1.default)());
// Manual fallback for OPTIONS requests (for maximum compatibility)
app.use((req, res, next) => {
    if (req.method === "OPTIONS") {
        const origin = req.headers.origin;
        if (origin === "https://odrlab.com" ||
            origin === "https://www.odrlab.com" ||
            origin === "https://api.odrlab.com" ||
            origin === "http://localhost:3000" ||
            origin === "https://odrlab.netlify.app") {
            res.header("Access-Control-Allow-Origin", origin);
        }
        res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-csrf-token");
        res.header("Access-Control-Allow-Credentials", "true");
        return res.sendStatus(200);
    }
    next();
});
app.use(express_1.default.json());
// CSRF protection setup - less restrictive for development
app.use((0, cookie_parser_1.default)());
const csrfProtection = (0, csurf_1.default)({
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
    if (req.path.startsWith("/api/auth/") ||
        req.path.startsWith("/api/public/") ||
        req.path === "/api/csrf-token" ||
        process.env.NODE_ENV !== "production") {
        return next();
    }
    // Only apply CSRF to state-changing requests on protected endpoints
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
        return csrfProtection(req, res, next);
    }
    next();
});
app.use("/api/chat", chat_1.default);
app.use("/api/auth", auth_1.default);
app.use("/api/ideas", auth_2.authenticateJWT, ideas_1.default);
app.use("/api/meetings", auth_2.authenticateJWT, meetings_1.default);
// Protect ODR Lab and Discussion routes
app.use("/api/odrlabs", auth_2.authenticateJWT, odrlabs_1.default);
app.use("/api/discussion", auth_2.authenticateJWT, discussion_1.default);
app.use("/api/admin", auth_2.authenticateJWT, admin_1.default);
app.use("/api/collaboration", auth_2.authenticateJWT, collaboration_1.default);
app.use("/api/mentors", auth_2.authenticateJWT, mentors_1.default);
// Add the user routes with authentication middleware
app.use("/api/user", auth_2.authenticateJWT, user_1.default);
app.use("/api/contact", index_1.default);
app.use(errorHandler_1.default);
exports.default = app;
