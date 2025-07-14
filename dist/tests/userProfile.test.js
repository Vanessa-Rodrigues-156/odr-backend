"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
describe('User Profile API', () => {
    let user;
    let jwt;
    beforeAll(async () => {
        // Create a test user in the database
        user = await prisma_1.default.user.create({
            data: {
                name: 'Test User',
                email: 'testuser@example.com',
                password: 'hashedpassword',
                userRole: 'INNOVATOR',
            },
        });
        jwt = await (0, auth_1.generateToken)(user);
    });
    afterAll(async () => {
        // Clean up test user
        await prisma_1.default.user.delete({ where: { id: user.id } });
        await prisma_1.default.$disconnect();
    });
    describe('GET /api/user/profile', () => {
        it('should require authentication', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/user/profile');
            expect(res.status).toBe(401);
        });
        it('should return user profile for authenticated user', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/user/profile')
                .set('Authorization', `Bearer ${jwt}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', user.id);
            expect(res.body).toHaveProperty('name', user.name);
            expect(res.body).toHaveProperty('email', user.email);
        });
    });
    describe('PUT /api/user/profile', () => {
        it('should require authentication', async () => {
            const res = await (0, supertest_1.default)(app_1.default).put('/api/user/profile').send({ name: 'New Name' });
            expect(res.status).toBe(401);
        });
        it('should validate input', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put('/api/user/profile')
                .set('Authorization', `Bearer ${jwt}`)
                .send({ name: '' });
            expect(res.status).toBe(400);
        });
        it('should update profile with valid input', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put('/api/user/profile')
                .set('Authorization', `Bearer ${jwt}`)
                .send({ name: 'Updated User' });
            expect(res.status).toBe(200);
            expect(res.body.user).toHaveProperty('name', 'Updated User');
        });
        it('should log audit event on profile update', async () => {
            await (0, supertest_1.default)(app_1.default)
                .put('/api/user/profile')
                .set('Authorization', `Bearer ${jwt}`)
                .send({ name: 'Audit User' });
            const audit = await prisma_1.default.auditLog.findFirst({
                where: { action: 'UPDATE_PROFILE', userId: user.id },
                orderBy: { createdAt: 'desc' },
            });
            expect(audit).toBeTruthy();
            expect(audit?.success).toBe(true);
        });
    });
});
