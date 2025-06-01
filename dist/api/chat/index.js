"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const router = (0, express_1.Router)();
// Chat with AI endpoint
router.post("/message", async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: "Message is required" });
        }
        // Call the Mistral API via Hugging Face Space
        const response = await axios_1.default.post('https://huggingface.co/spaces/hysts/mistral-7b/api/predict', {
            data: [
                message, // user message
                1024, // max_tokens
                0.6, // temperature
                0.9, // top_p
                50, // top_k
                1.2 // repetition_penalty
            ],
            fn_index: 0 // This corresponds to the "/chat" endpoint
        }, {
            headers: {
                'Content-Type': 'application/json',
            }
        });
        // Extract the AI response
        const aiResponse = response.data.data[0];
        return res.json({ response: aiResponse });
    }
    catch (error) {
        console.error("Error in chat API:", error);
        return res.status(500).json({
            error: "Failed to get response from AI service",
            details: process.env.NODE_ENV !== 'production' ? String(error) : undefined
        });
    }
});
exports.default = router;
