"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
router.post("/", async (req, res) => {
    console.log("[Chatbot] Received request");
    try {
        const { message } = req.body;
        console.log("[Chatbot] Request body:", req.body);
        if (!message) {
            console.warn("[Chatbot] No message provided");
            return res.status(400).json({ error: "Message is required" });
        }
        // Use dynamic import for ESM-only @gradio/client
        console.log("[Chatbot] Importing @gradio/client...");
        const { Client } = await Promise.resolve().then(() => __importStar(require("@gradio/client")));
        console.log("[Chatbot] Connecting to model...");
        const client = await Client.connect("hysts/mistral-7b");
        console.log("[Chatbot] Connected. Sending predict request...");
        // Timeout wrapper
        const result = await Promise.race([
            client.predict("/chat", {
                message: message,
                param_2: 1024,
                param_3: 0.6,
                param_4: 0.9,
                param_5: 50,
                param_6: 1.2,
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Model timed out")), 30000)),
        ]);
        console.log("[Chatbot] Model response:", result.data);
        return res.json({ response: result.data });
    }
    catch (error) {
        console.error("[Chatbot] Error in chatbot API:", error);
        let msg = "Failed to process the request";
        if (error instanceof Error && error.message.includes("timed out")) {
            msg = "The language model took too long to respond. Please try again.";
        }
        return res.status(500).json({ error: msg });
    }
});
router.post("/test", async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }
        // Test: echo the message and simulate a successful response
        return res.json({ response: `Echo: ${message}` });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : "An unexpected error occurred";
        console.error("Chatbot test error:", msg);
        return res.status(500).json({ error: msg });
    }
});
exports.default = router;
