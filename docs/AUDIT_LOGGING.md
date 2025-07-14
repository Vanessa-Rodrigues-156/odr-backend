# Audit Logging in ODR Backend

## What is Audit Logging?
Audit logging is the process of recording significant actions and changes in the system, especially those that affect sensitive data, user permissions, or system integrity. These logs are stored persistently in the database and are used for security, compliance, and troubleshooting purposes. Each audit log entry typically records:
- The action performed (e.g., UPDATE_PROFILE, DELETE_IDEA)
- The user who performed the action
- The user's role
- The target entity affected (e.g., user, idea)
- Whether the action was successful
- A message describing the action
- The IP address of the requester
- Timestamp (automatically handled by the database)

## Implementation Details
- **AuditLog Prisma Model**: Defined in `prisma/schema.prisma` as the `AuditLog` table.
- **Logging Utility**: `logAuditEvent` in `src/lib/auditLog.ts` is used to write audit log entries.
- **Integration**: Audit logging is called in sensitive backend routes after key actions (success or failure).

### Example: Logging a Profile Update
```typescript
await logAuditEvent({
  action: 'UPDATE_PROFILE',
  userId: userId,
  userRole: existingUser.userRole as any,
  targetId: userId,
  targetType: 'USER',
  success,
  message,
  ipAddress: req.ip,
});
```

## Routes/Actions with Audit Logging Implemented
- **Admin Idea Approval/Rejection**: `/api/admin/index.ts`
- **Admin Mentor Approval/Rejection**: `/api/admin/approve-mentor.ts`
- **User Migration Script**: `/src/scripts/importBackupData.ts`
- **User Profile Update**: `/api/user/profile.ts`
- **Idea Deletion**: `/api/ideas/index.ts`

## Routes/Actions Pending Audit Logging
- Idea update (`PUT /api/ideas/:id`)
- Idea creation (`POST /api/ideas`)
- Mentor application (`POST /api/user/apply-mentor`)
- Leaving as collaborator (`DELETE /api/collaboration/:ideaId/leave-collaborator`)
- Leaving as mentor (`DELETE /api/collaboration/:ideaId/leave-mentor`)
- Other user role-specific updates (if not covered in profile update)
- Password change/reset endpoints (if/when implemented)
- Any other destructive or sensitive actions in admin/user/collaboration/ideas routes

## How to Add Audit Logging to a Route
1. Import the utility:
   ```typescript
   import { logAuditEvent } from "../../lib/auditLog";
   ```
2. After the sensitive action (success or failure), call `logAuditEvent` with appropriate parameters.
3. Ensure both success and failure cases are logged.

## References
- `src/lib/auditLog.ts` — Logging utility
- `prisma/schema.prisma` — AuditLog model
- See above for example code snippets.

---
_Last updated: 14 July 2025_
