"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditEvent = logAuditEvent;
const prisma_1 = __importDefault(require("../lib/prisma"));
async function logAuditEvent(params) {
    try {
        await prisma_1.default.auditLog.create({
            data: {
                action: params.action,
                userId: params.userId,
                userRole: params.userRole,
                targetId: params.targetId,
                targetType: params.targetType,
                success: params.success,
                message: params.message,
                ipAddress: params.ipAddress,
            },
        });
    }
    catch (err) {
        // Fallback: log to console if DB logging fails
        console.error('[AuditLog] Failed to write audit log:', err, params);
    }
}
