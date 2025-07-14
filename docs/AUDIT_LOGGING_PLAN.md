# Audit Logging Plan

## 1. Overview
Implement a persistent audit log for all sensitive actions (admin approvals, user updates, deletions, etc.) to ensure traceability, accountability, and security compliance.

## 2. AuditLog Model (Prisma)
- `id`: Unique identifier (UUID)
- `action`: Action type (e.g., APPROVE_IDEA, UPDATE_PROFILE)
- `userId`: ID of the user performing the action
- `userRole`: Role of the user (ADMIN, INNOVATOR, etc.)
- `targetId`: ID of the entity affected (e.g., ideaId, userId)
- `targetType`: Type of entity (e.g., IDEA, USER)
- `success`: Boolean indicating if the action succeeded
- `message`: Optional message or error details
- `ipAddress`: IP address of the requester
- `createdAt`: Timestamp

## 3. Logging Utility
- Create a utility function (e.g., `logAuditEvent`) to insert records into the `AuditLog` table.
- Accepts parameters for all model fields.
- Should be called in all sensitive backend routes (admin actions, user updates, deletions, etc.).

## 4. Integration Points
- **Admin Actions:** Approve/reject ideas, approve/reject mentors, delete users, etc.
- **User Actions:** Profile updates, password changes, sensitive submissions.
- **Authentication Events:** Login, logout, failed login attempts (optional).

## 5. Best Practices
- Always log both success and failure events.
- Include as much context as possible (user, target, IP, error message).
- Never log sensitive data (e.g., passwords).
- Regularly review audit logs for suspicious activity.

## 6. Example Usage
```ts
await logAuditEvent({
  action: 'APPROVE_IDEA',
  userId: req.user?.id,
  userRole: req.user?.userRole,
  targetId: ideaId,
  targetType: 'IDEA',
  success: true,
  message: 'Idea approved',
  ipAddress: req.ip,
});
```

## 7. Future Enhancements
- Add a frontend/admin UI for viewing audit logs.
- Integrate with external SIEM/logging services if required.
- Add alerting for suspicious or failed actions.

---
This plan ensures a robust, persistent audit trail for all critical actions in the system.
