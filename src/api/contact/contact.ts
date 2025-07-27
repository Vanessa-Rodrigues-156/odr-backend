import { Router, Request, Response } from "express";
import csurf from "csurf";
// If using Node 18+, fetch is global. Otherwise, install node-fetch and import it:
// import fetch from "node-fetch";

const router = Router();
const csrfProtection = csurf({ cookie: true });

// Helper function to sanitize input
function sanitize(input: string, maxLength: number = 256): string {
  return input
    .replace(/[<>;`$\\]/g, "") // Remove potentially dangerous characters
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim()
    .slice(0, maxLength); // Limit length
}

// POST /api/contact
router.post("/", csrfProtection, async (req: Request, res: Response) => {
  let { name, email,  message } = req.body;

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

  try {
    // Append to Google Sheet via Apps Script
    await fetch("https://script.google.com/macros/s/AKfycbwcj6v7EHfuAT5Co4yYtnmuwiK2jLnyRL7l1LKZhXIle_6pHrj-FrZANFr__aYhHp2n/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email,  message }),
    });
    console.log(name, email, message);
    res.status(200).json({ success: true });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 'EBADCSRFTOKEN') {
      return res.status(403).json({ error: "Your session has expired or the request was blocked for security reasons. Please refresh and try again." });
    }
    res.status(500).json({ error: "Failed to send message." });
  }
});

// CSRF token endpoint for frontend
router.get("/csrf-token", csrfProtection, (req: Request, res: Response) => {
  if (typeof req.csrfToken === 'function') {
    res.status(200).json({ csrfToken: req.csrfToken() });
  } else {
    res.status(500).json({ error: "CSRF token function not available." });
  }
});

export default router;