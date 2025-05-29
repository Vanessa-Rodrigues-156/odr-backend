import { Router } from "express";
import { authenticateJWT, AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import jaasTokenHandler from "./jaasToken";

const router = Router();

// Protect all meeting routes
router.use(authenticateJWT);

// TODO: Add meetings endpoints

// JaaS JWT endpoint
// jaasTokenHandler is an array of middleware functions [ensureAuthenticated, jaasTokenHandlerImpl]
router.get("/:id/jaas-token", ...jaasTokenHandler);

export default router;
