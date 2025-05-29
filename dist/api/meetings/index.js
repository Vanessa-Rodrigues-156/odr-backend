"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const jaasToken_1 = __importDefault(require("./jaasToken"));
const router = (0, express_1.Router)();
// Protect all meeting routes
router.use(auth_1.authenticateJWT);
// TODO: Add meetings endpoints
// JaaS JWT endpoint
// jaasTokenHandler is an array of middleware functions [ensureAuthenticated, jaasTokenHandlerImpl]
router.get("/:id/jaas-token", ...jaasToken_1.default);
exports.default = router;
