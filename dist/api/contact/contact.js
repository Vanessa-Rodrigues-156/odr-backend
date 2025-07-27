"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const csurf_1 = __importDefault(require("csurf"));
const router = (0, express_1.Router)();
const csrfProtection = (0, csurf_1.default)({ cookie: true });
// Helper function to sanitize input
function sanitize(input, maxLength = 256) {
    return input
        .replace(/[<>;`$\\]/g, "") // Remove potentially dangerous characters
        .replace(/\s+/g, " ") // Collapse whitespace
        .trim()
        .slice(0, maxLength); // Limit length
}
// POST /api/contact
router.post("/", csrfProtection, async (req, res) => {
    try {
        let { name, email, message } = req.body;
        // Basic validation
        if (!name || !email || !message) {
            return res.status(400).json({ error: "All fields are required." });
        }
        // Prevent header injection
        if (/\r|\n/.test(name) || /\r|\n/.test(email)) {
            return res.status(400).json({ error: "Invalid input." });
        }
        // Sanitize and limit input
        name = sanitize(name, 100);
        email = sanitize(email, 100);
        message = sanitize(message, 1000);
        // Log for debugging CSRF issues
        console.log("CSRF token received:", req.headers["x-csrf-token"]);
        //console.log("Expected CSRF token:", req.csrfToken());
        try {
            // Append to Google Sheet via Apps Script
            await fetch("https://script.google.com/macros/s/AKfycbwcj6v7EHfuAT5Co4yYtnmuwiK2jLnyRL7l1LKZhXIle_6pHrj-FrZANFr__aYhHp2n/exec", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, message }),
            });
            console.log(name, email, message);
            res.status(200).json({ success: true });
        }
        catch (error) {
            console.error("Contact error:", error);
            if (error && typeof error === 'object' && 'code' in error && error.code === 'EBADCSRFTOKEN') {
                console.error("CSRF token mismatch");
                return res.status(403).json({ error: "Your session has expired or the request was blocked for security reasons. Please refresh and try again." });
            }
            res.status(500).json({ error: "Failed to send message." });
        }
    }
    catch (error) {
        console.error("Contact error:", error);
        if (error && typeof error === 'object' && 'code' in error && error.code === 'EBADCSRFTOKEN') {
            console.error("CSRF token mismatch");
            return res.status(403).json({ error: "Your session has expired or the request was blocked for security reasons. Please refresh and try again." });
        }
        res.status(500).json({ error: "Failed to send message." });
    }
});
// CSRF token endpoint for frontend
router.get("/csrf-token", csrfProtection, (req, res) => {
    try {
        if (typeof req.csrfToken === 'function') {
            const token = req.csrfToken();
            console.log("Generated new CSRF token:", token);
            res.status(200).json({ csrfToken: token });
        }
        else {
            console.error("CSRF token function not available");
            res.status(500).json({ error: "CSRF token function not available." });
        }
    }
    catch (error) {
        console.error("Error generating CSRF token:", error);
        res.status(500).json({ error: "Failed to generate CSRF token." });
    }
});
exports.default = router;
