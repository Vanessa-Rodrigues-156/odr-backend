import prisma from '../lib/prisma';
import { UserRole } from '@prisma/client';

export interface AuditLogParams {
  action: string;
  userId?: string;
  userRole?: UserRole;
  targetId?: string;
  targetType?: string;
  success: boolean;
  message?: string;
  ipAddress?: string;
}

export async function logAuditEvent(params: AuditLogParams) {
  try {
    await prisma.auditLog.create({
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
  } catch (err) {
    // Fallback: log to console if DB logging fails
    console.error('[AuditLog] Failed to write audit log:', err, params);
  }
}
