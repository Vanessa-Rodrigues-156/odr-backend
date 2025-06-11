"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatOptimizer = void 0;
const together_ai_1 = __importDefault(require("together-ai"));
// Cached responses for common questions
const CACHED_RESPONSES = new Map([
    ["what is odr", "ODR (Online Dispute Resolution) uses technology to resolve disputes between parties through online mediation, arbitration, and negotiation platforms."],
    ["what is mediation", "Mediation is a voluntary process where a neutral third party helps disputing parties reach a mutually acceptable agreement."],
    ["what is arbitration", "Arbitration is a binding dispute resolution process where an arbitrator makes a final decision after hearing both parties."],
    ["difference between mediation and arbitration", "Mediation: Non-binding, parties control outcome. Arbitration: Binding decision made by arbitrator."],
    ["what legal services do you offer", "ODR Lab provides online mediation, arbitration services, legal consultation, and dispute resolution technology platforms."]
]);
// System prompt - reused across requests
const SYSTEM_PROMPT = "You're a helpful legal assistant for ODR Lab. Provide concise, accurate legal guidance about online dispute resolution. Keep responses under 5 sentences unless asked for details.";
class ChatOptimizer {
    constructor(apiKey) {
        this.together = new together_ai_1.default({ apiKey });
    }
    /**
     * Check if query matches cached responses
     */
    getCachedResponse(query) {
        const normalizedQuery = query.toLowerCase().trim();
        for (const [key, response] of CACHED_RESPONSES) {
            if (normalizedQuery.includes(key)) {
                return response;
            }
        }
        return null;
    }
    /**
     * Trim conversation history to keep only recent messages
     */
    trimHistory(messages, maxPairs = 3) {
        // Always keep system message
        const systemMessage = messages.find(m => m.role === "system");
        const conversationMessages = messages.filter(m => m.role !== "system");
        // Keep only last N user-assistant pairs (N*2 messages)
        const maxMessages = maxPairs * 2;
        const recentMessages = conversationMessages.slice(-maxMessages);
        return systemMessage ? [systemMessage, ...recentMessages] : recentMessages;
    }
    /**
     * Summarize older conversation if history is too long
     */
    async summarizeHistory(messages) {
        if (messages.length <= 6)
            return ""; // No need to summarize short conversations
        const oldMessages = messages.slice(1, -4); // Skip system and keep last 2 pairs
        const conversationText = oldMessages
            .map(m => `${m.role}: ${m.content}`)
            .join("\n");
        try {
            const response = await this.together.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "Summarize this conversation in 1-2 sentences for context."
                    },
                    {
                        role: "user",
                        content: conversationText
                    }
                ],
                model: "mistralai/Mistral-7B-Instruct-v0.2", // Lighter model for summarization
                max_tokens: 50,
                temperature: 0.3
            });
            return response.choices[0].message?.content || "";
        }
        catch (error) {
            console.error("Failed to summarize history:", error);
            return "Earlier conversation covered various ODR topics.";
        }
    }
    /**
     * Select appropriate model based on query complexity
     */
    selectModel(query, modelType) {
        const complexKeywords = ['legal advice', 'contract', 'lawsuit', 'jurisdiction', 'precedent'];
        const isComplex = complexKeywords.some(keyword => query.toLowerCase().includes(keyword));
        if (modelType === 'light' || !isComplex) {
            return "mistralai/Mistral-7B-Instruct-v0.2";
        }
        return "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free";
    }
    /**
     * Remove markdown formatting and convert to plain text
     */
    stripMarkdown(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.*?)\*/g, '$1') // Remove italic
            .replace(/_(.*?)_/g, '$1') // Remove underscore italic
            .replace(/#{1,6}\s/g, '') // Remove headers
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/`(.*?)`/g, '$1') // Remove inline code
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
            .trim();
    }
    /**
     * Main optimization function
     */
    async optimizeChat(messages, newQuery, options) {
        // Check for cached response first
        const cachedResponse = this.getCachedResponse(newQuery);
        if (cachedResponse) {
            return cachedResponse;
        }
        // Prepare conversation history
        let conversationHistory = [...messages];
        // Add system message if not present
        if (!conversationHistory.find(m => m.role === "system")) {
            conversationHistory.unshift({
                role: "system",
                content: SYSTEM_PROMPT
            });
        }
        // Summarize old history if conversation is long
        if (conversationHistory.length > 8) {
            const summary = await this.summarizeHistory(conversationHistory);
            if (summary) {
                // Replace old messages with summary
                const systemMsg = conversationHistory[0];
                const recentMessages = conversationHistory.slice(-4);
                conversationHistory = [
                    systemMsg,
                    { role: "assistant", content: `Context: ${summary}` },
                    ...recentMessages
                ];
            }
        }
        // Trim history to recent messages
        conversationHistory = this.trimHistory(conversationHistory, options.maxHistory);
        // Add user query
        conversationHistory.push({
            role: "user",
            content: newQuery
        });
        // Select appropriate model
        const model = this.selectModel(newQuery, options.modelType);
        // Make API call with optimized parameters
        const response = await this.together.chat.completions.create({
            messages: conversationHistory,
            model,
            max_tokens: options.maxTokens,
            temperature: 0.7,
            stop: ["User:", "Assistant:", "\n\nUser:", "\n\nAssistant:"],
            stream: false
        });
        const aiResponse = response.choices[0].message?.content || "";
        // Strip markdown formatting
        return this.stripMarkdown(aiResponse);
    }
}
exports.ChatOptimizer = ChatOptimizer;
