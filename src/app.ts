import express from "express";
import cors from "cors";
import authRoutes from "./api/auth";
import ideasRoutes from "./api/ideas";
import meetingsRoutes from "./api/meetings";
import errorHandler from "./middleware/errorHandler";
import { authenticateJWT } from "./middleware/auth";
import odrlabsRoutes from "./api/odrlabs";
import submitIdeaRoutes from "./api/submit-idea";
import discussionRoutes from "./api/discussion";
import adminRoutes from "./api/admin";
import collaborationRoutes from "./api/collaboration";
import chatbotRoutes from "./api/chat";
import mentorsRoutes from "./api/mentors";

const app = express();

app.use(
  cors({
    origin: "https://www.odrlab.com", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
// Explicitly handle preflight OPTIONS requests for all routes
app.options("https://www.odrlab.com", cors());

app.use(express.json());

app.use("/api/chatbot", chatbotRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/ideas", authenticateJWT, ideasRoutes);
app.use("/api/meetings", authenticateJWT, meetingsRoutes);
// Protect ODR Lab and Discussion routes
app.use("/api/odrlabs", authenticateJWT, odrlabsRoutes);
app.use("/api/discussion", authenticateJWT, discussionRoutes);
app.use("/api/submit-idea", authenticateJWT, submitIdeaRoutes);
app.use("/api/admin", authenticateJWT, adminRoutes);
app.use("/api/collaboration", authenticateJWT, collaborationRoutes);
app.use("/api/mentors", authenticateJWT, mentorsRoutes);

app.use(errorHandler);

export default app;
