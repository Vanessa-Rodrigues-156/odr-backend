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
const collaboration_1 = __importDefault(require("./api/collaboration"));
const chat_1 = __importDefault(require("./api/chat"));
const mentors_1 = __importDefault(require("./api/mentors"));
// Import the user routes
const user_1 = __importDefault(require("./api/user"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: [
        "https://odrlab.com",
        "https://www.odrlab.com",
        "https://api.odrlab.com",
        "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
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
            origin === "https://api.odrlab.com") {
            res.header("Access-Control-Allow-Origin", origin);
        }
        res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.header("Access-Control-Allow-Credentials", "true");
        return res.sendStatus(200);
    }
    next();
});
app.use(express_1.default.json());
app.use("/api/chat", chat_1.default);
app.use("/api/auth", auth_1.default);
app.use("/api/ideas", auth_2.authenticateJWT, ideas_1.default);
app.use("/api/meetings", auth_2.authenticateJWT, meetings_1.default);
// Protect ODR Lab and Discussion routes
app.use("/api/odrlabs", auth_2.authenticateJWT, odrlabs_1.default);
app.use("/api/discussion", auth_2.authenticateJWT, discussion_1.default);
app.use("/api/submit-idea", auth_2.authenticateJWT, submit_idea_1.default);
app.use("/api/admin", auth_2.authenticateJWT, admin_1.default);
app.use("/api/collaboration", auth_2.authenticateJWT, collaboration_1.default);
app.use("/api/mentors", auth_2.authenticateJWT, mentors_1.default);
// Add the user routes
app.use("/api/user", user_1.default);
app.use(errorHandler_1.default);
exports.default = app;
