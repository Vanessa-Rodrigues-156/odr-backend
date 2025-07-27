# Plan of Action: Audit Logging & Test Coverage for Sensitive Routes

## Objective
Ensure all sensitive backend routes are covered by both persistent audit logging and comprehensive automated tests, with a focus on security, compliance, and correct frontend/backend integration.

---

## Step-by-Step Plan

### 1. **Inventory & Prioritization**
- Review all backend routes for sensitive actions (data changes, deletions, permission changes, etc.).
- Prioritize routes based on risk and user impact.
- Maintain a checklist of routes with/without audit logging and tests (see `AUDIT_LOGGING.md`).

### 2. **Audit Logging Integration**
- For each route/action pending audit logging:
  1. Identify the sensitive action(s) and expected outcomes (success/failure).
  2. Import and use `logAuditEvent` after the action, logging all relevant context (user, action, target, result, IP, etc.).
  3. Ensure both success and failure cases are logged.
  4. Update `AUDIT_LOGGING.md` to reflect progress.

### 3. **Automated Test Coverage**
- For each sensitive route:
  1. Create or update a test file in `src/tests/`.
  2. Use Jest + Supertest for API route testing.
  3. Cover:
     - Authentication & authorization (JWT, CSRF, permissions)
     - Valid/invalid input and edge cases
     - Database state and schema compliance
     - Response format (matching frontend expectations)
     - Audit logging side effects (verify audit log entries)
  4. Use test users and clean up after tests.
  5. Document any gaps or issues found.

### 4. **Documentation & Review**
- Keep `AUDIT_LOGGING.md` up to date with what is implemented and pending.
- Document the test plan and coverage in this file.
- Review with the team for completeness and compliance.

---

## Example Workflow for Each Route
1. **Integrate audit logging** (if missing)
2. **Write/extend tests** for:
   - Auth/security
   - Input validation
   - Response format
   - Audit log side effects
3. **Run tests and validate**
4. **Update documentation/checklist**

---

## Next Steps
- Proceed route by route (see `AUDIT_LOGGING.md` for pending list)
- After each route, update this plan and the checklist
- Review and refactor as needed for security and maintainability

---
_Last updated: 14 July 2025_
