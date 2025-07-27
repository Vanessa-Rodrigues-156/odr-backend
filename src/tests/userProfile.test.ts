

import type { User } from '@prisma/client';
import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import { generateToken } from '../middleware/auth';

describe('User Profile API', () => {

 
 let user: User;
 let jwt: string;

  beforeAll(async () => {
    // Create a test user in the database
    user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'hashedpassword',
        userRole: 'INNOVATOR',
      },
    });
    jwt = await generateToken(user);
  });

  afterAll(async () => {
    // Clean up test user
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  });

  describe('GET /api/user/profile', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/user/profile');
      expect(res.status).toBe(401);
    });

    it('should return user profile for authenticated user', async () => {
      const res = await request(app)
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
      const res = await request(app).put('/api/user/profile').send({ name: 'New Name' });
      expect(res.status).toBe(401);
    });

    it('should validate input', async () => {
      const res = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${jwt}`)
        .send({ name: '' });
      expect(res.status).toBe(400);
    });

    it('should update profile with valid input', async () => {
      const res = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${jwt}`)
        .send({ name: 'Updated User' });
      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('name', 'Updated User');
    });

    it('should log audit event on profile update', async () => {
      await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${jwt}`)
        .send({ name: 'Audit User' });
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'UPDATE_PROFILE', userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).toBeTruthy();
      expect(audit?.success).toBe(true);
    });
  });
});
