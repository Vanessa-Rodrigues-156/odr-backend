"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const helmet_1 = __importDefault(require("helmet"));
// Dynamic Content Security Policy based on environment
const isProduction = process.env.NODE_ENV === "production";
const cspDirectives = isProduction
    ? {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://www.google-analytics.com"],
        connectSrc: ["'self'", "https://odr-backend.onrender.com", "https://api.odrlab.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        frameSrc: ["'self'"],
    }
    : {
        defaultSrc: ["'self'", "localhost:*", "127.0.0.1:*"],
        scriptSrc: ["'self'", "'unsafe-inline'", "localhost:*", "127.0.0.1:*"],
        styleSrc: ["'self'", "'unsafe-inline'", "localhost:*", "127.0.0.1:*"],
        imgSrc: ["'self'", "data:", "localhost:*", "127.0.0.1:*"],
        connectSrc: ["'self'", "localhost:*", "127.0.0.1:*"],
        fontSrc: ["'self'", "localhost:*", "127.0.0.1:*"],
        frameSrc: ["'self'", "localhost:*", "127.0.0.1:*"],
    };
const securityHeaders = (0, helmet_1.default)({
    // Content Security Policy
    contentSecurityPolicy: {
        directives: cspDirectives,
    },
    // X-Frame-Options: SAMEORIGIN
    frameguard: {
        action: "sameorigin",
    },
    // X-Content-Type-Options: nosniff
    noSniff: true,
    // Referrer-Policy: no-referrer
    referrerPolicy: { policy: "no-referrer" },
    // Strict-Transport-Security (only in production)
    hsts: isProduction
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
});
exports.default = securityHeaders;
