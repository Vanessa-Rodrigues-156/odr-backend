"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatOptimizer_1 = require("../../utils/chatOptimizer");
const router = (0, express_1.Router)();
// Initialize chat optimizer
const chatOptimizer = new chatOptimizer_1.ChatOptimizer(process.env.TOGETHER_API_KEY || "");
// Store conversation history per session (in production, use Redis or database)
const sessionHistory = new Map();
// Chat endpoint with optimization
router.post("/", async (req, res) => {
    try {
        const { message, sessionId, detail = false } = req.body;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: "Message is required" });
        }
        // Generate session ID if not provided
        const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Get or create session history
        let history = sessionHistory.get(currentSessionId) || [];
        // Optimize chat with token-saving strategies
        const optimizedResponse = await chatOptimizer.optimizeChat(history, detail ? `Please provide detailed explanation: ${message}` : message, {
            maxHistory: 3, // Keep last 3 message pairs
            maxTokens: detail ? 300 : 150, // Limit response length
            useDetailedResponse: detail,
            modelType: detail ? 'standard' : 'light'
        });
        // Update session history
        history.push({ role: "user", content: message, timestamp: new Date().toISOString() }, { role: "assistant", content: optimizedResponse, timestamp: new Date().toISOString() });
        // Keep only recent history to prevent memory bloat
        if (history.length > 12) {
            history = history.slice(-8); // Keep last 4 pairs
        }
        sessionHistory.set(currentSessionId, history);
        return res.json({
            response: optimizedResponse,
            sessionId: currentSessionId,
            canExpand: !detail && optimizedResponse.length < 200 // Show expand option for short responses
        });
    }
    catch (error) {
        console.error("Together AI API error:", error);
        if (error.status === 429) {
            return res.status(429).json({
                error: "Rate limit exceeded. Please try again later."
            });
        }
        return res.status(500).json({
            error: "Failed to get response from AI service",
            details: process.env.NODE_ENV !== 'production' ? String(error) : undefined
        });
    }
});
exports.default = router;
