import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../app';
import { requireAuth } from '../middleware/auth';

const prisma = new PrismaClient();

const app = createApp();

afterAll(() => prisma.$disconnect());

beforeAll(async () => {
  await prisma.user.upsert({
    where: { username: 'testuser' },
    update: {},
    create: { username: 'testuser', passwordHash: await bcrypt.hash('testpass', 10) },
  });
});

describe('requireAuth middleware (unit)', () => {
  it('returns 401 when no session userId', () => {
    const req = { session: {} } as any;
    const res = { status: (c: number) => ({ json: () => c }) } as any;
    let called = false;
    requireAuth(req, res, () => { called = true; });
    expect(called).toBe(false);
  });

  it('calls next and sets req.user when userId present', () => {
    const req = { session: { userId: 'abc' } } as any;
    const res = {} as any;
    let called = false;
    requireAuth(req, res, () => { called = true; });
    expect(called).toBe(true);
    expect(req.user).toEqual({ id: 'abc' });
  });
});

describe('POST /api/auth/login', () => {
  it('returns 200 and sets a cookie on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'testpass' });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('testuser');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when body fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/ingredients auth guard', () => {
  it('returns 401 without a session', async () => {
    const res = await request(app).get('/api/ingredients');
    expect(res.status).toBe(401);
  });

  it('returns 200 with a valid session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: 'testuser', password: 'testpass' });
    const res = await agent.get('/api/ingredients');
    expect(res.status).toBe(200);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the session so subsequent requests return 401', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: 'testuser', password: 'testpass' });
    await agent.post('/api/auth/logout');
    const res = await agent.get('/api/ingredients');
    expect(res.status).toBe(401);
  });
});
