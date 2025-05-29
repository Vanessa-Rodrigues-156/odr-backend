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
const submit_idea_1 = __importDefault(require("./api/submit-idea"));
const discussion_1 = __importDefault(require("./api/discussion"));
const admin_1 = __importDefault(require("./api/admin"));
const chatbot_1 = __importDefault(require("./api/chatbot"));
const collaboration_1 = __importDefault(require("./api/collaboration"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Remove trailing slash if present
        if (origin) {
            const cleanOrigin = origin.replace(/\/$/, "");
            callback(null, cleanOrigin === "http://localhost:3000" ? cleanOrigin : false);
        }
        else {
            callback(null, false);
        }
    },
    credentials: true,
}));
app.use(express_1.default.json());
app.use("/api/chatbot", chatbot_1.default);
app.use("/api/auth", auth_1.default);
app.use("/api/ideas", auth_2.authenticateJWT, ideas_1.default);
app.use("/api/meetings", auth_2.authenticateJWT, meetings_1.default);
// Protect ODR Lab and Discussion routes
app.use("/api/odrlabs", auth_2.authenticateJWT, odrlabs_1.default);
app.use("/api/discussion", auth_2.authenticateJWT, discussion_1.default);
app.use("/api/submit-idea", auth_2.authenticateJWT, submit_idea_1.default);
app.use("/api/admin", auth_2.authenticateJWT, admin_1.default);
app.use("/api/collaboration", auth_2.authenticateJWT, collaboration_1.default); // Add the new route
app.use(errorHandler_1.default);
exports.default = app;
