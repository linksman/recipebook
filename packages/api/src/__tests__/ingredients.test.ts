import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../app';
import { isIngredientLocked } from '../services/ingredientService';

const prisma = new PrismaClient();

const app = createApp();

afterAll(() => prisma.$disconnect());

async function getAgent() {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username: 'testuser2', password: 'testpass2' });
  return agent;
}

beforeAll(async () => {
  await prisma.user.upsert({
    where: { username: 'testuser2' },
    update: {},
    create: { username: 'testuser2', passwordHash: await bcrypt.hash('testpass2', 10) },
  });
});

describe('isIngredientLocked (unit)', () => {
  it('returns false when ingredient is not used', async () => {
    const ing = await prisma.ingredient.create({
      data: { name: 'Unused', strictUnit: 'Grams', caloriesPerUnit: 1, carbsPerUnit: 0, fatPerUnit: 0, proteinPerUnit: 0 },
    });
    expect(await isIngredientLocked(ing.id)).toBe(false);
    await prisma.ingredient.delete({ where: { id: ing.id } });
  });

  it('returns true when ingredient is used in a recipe', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { username: 'testuser2' } });
    const ing = await prisma.ingredient.create({
      data: { name: 'UsedIng', strictUnit: 'Grams', caloriesPerUnit: 1, carbsPerUnit: 0, fatPerUnit: 0, proteinPerUnit: 0 },
    });
    const recipe = await prisma.recipe.create({
      data: { title: 'Test Recipe', userId: user.id },
    });
    await prisma.recipeIngredient.create({
      data: { recipeId: recipe.id, ingredientId: ing.id, amount: 100 },
    });
    expect(await isIngredientLocked(ing.id)).toBe(true);
    await prisma.recipeIngredient.deleteMany({ where: { ingredientId: ing.id } });
    await prisma.recipe.delete({ where: { id: recipe.id } });
    await prisma.ingredient.delete({ where: { id: ing.id } });
  });
});

describe('GET /api/ingredients', () => {
  it('returns sorted list with isLocked field', async () => {
    const agent = await getAgent();
    const res = await agent.get('/api/ingredients');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('isLocked');
    }
  });
});

describe('POST /api/ingredients', () => {
  it('creates an ingredient and returns 201', async () => {
    const agent = await getAgent();
    const res = await agent.post('/api/ingredients').send({
      name: 'Broccoli',
      strictUnit: 'Grams',
      caloriesPerUnit: 0.34,
      carbsPerUnit: 0.07,
      fatPerUnit: 0.004,
      proteinPerUnit: 0.028,
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Broccoli');
    expect(res.body.isLocked).toBe(false);
  });

  it('returns 409 on duplicate name', async () => {
    const agent = await getAgent();
    await agent.post('/api/ingredients').send({
      name: 'DupIngredient',
      strictUnit: 'Grams',
      caloriesPerUnit: 1,
      carbsPerUnit: 0,
      fatPerUnit: 0,
      proteinPerUnit: 0,
    });
    const res = await agent.post('/api/ingredients').send({
      name: 'DupIngredient',
      strictUnit: 'Grams',
      caloriesPerUnit: 1,
      carbsPerUnit: 0,
      fatPerUnit: 0,
      proteinPerUnit: 0,
    });
    expect(res.status).toBe(409);
  });

  it('returns 422 when calories is negative', async () => {
    const agent = await getAgent();
    const res = await agent.post('/api/ingredients').send({
      name: 'BadIng',
      strictUnit: 'Grams',
      caloriesPerUnit: -1,
      carbsPerUnit: 0,
      fatPerUnit: 0,
      proteinPerUnit: 0,
    });
    expect(res.status).toBe(422);
    expect(res.body.errors.caloriesPerUnit).toBeDefined();
  });

  it('returns 422 when name is missing', async () => {
    const agent = await getAgent();
    const res = await agent.post('/api/ingredients').send({
      strictUnit: 'Grams',
      caloriesPerUnit: 1,
      carbsPerUnit: 0,
      fatPerUnit: 0,
      proteinPerUnit: 0,
    });
    expect(res.status).toBe(422);
    expect(res.body.errors.name).toBeDefined();
  });
});

describe('PUT /api/ingredients/:id', () => {
  it('updates a free ingredient and returns 200', async () => {
    const agent = await getAgent();
    const create = await agent.post('/api/ingredients').send({
      name: 'UpdateMe',
      strictUnit: 'Grams',
      caloriesPerUnit: 1,
      carbsPerUnit: 0,
      fatPerUnit: 0,
      proteinPerUnit: 0,
    });
    const res = await agent.put(`/api/ingredients/${create.body.id}`).send({
      name: 'UpdatedName',
      strictUnit: 'Milliliters',
      caloriesPerUnit: 2,
      carbsPerUnit: 0,
      fatPerUnit: 0,
      proteinPerUnit: 0,
    });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('UpdatedName');
  });

  it('returns 409 when ingredient is locked', async () => {
    const agent = await getAgent();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: 'testuser2' } });
    const ing = await prisma.ingredient.create({
      data: { name: 'LockedPut', strictUnit: 'Grams', caloriesPerUnit: 1, carbsPerUnit: 0, fatPerUnit: 0, proteinPerUnit: 0 },
    });
    const recipe = await prisma.recipe.create({ data: { title: 'PutLockRecipe', userId: user.id } });
    await prisma.recipeIngredient.create({ data: { recipeId: recipe.id, ingredientId: ing.id, amount: 1 } });

    const res = await agent.put(`/api/ingredients/${ing.id}`).send({
      name: 'LockedPut',
      strictUnit: 'Grams',
      caloriesPerUnit: 1,
      carbsPerUnit: 0,
      fatPerUnit: 0,
      proteinPerUnit: 0,
    });
    expect(res.status).toBe(409);

    await prisma.recipeIngredient.deleteMany({ where: { ingredientId: ing.id } });
    await prisma.recipe.delete({ where: { id: recipe.id } });
    await prisma.ingredient.delete({ where: { id: ing.id } });
  });
});

describe('DELETE /api/ingredients/:id', () => {
  it('deletes a free ingredient and returns 204', async () => {
    const agent = await getAgent();
    const create = await agent.post('/api/ingredients').send({
      name: 'DeleteMe',
      strictUnit: 'Units',
      caloriesPerUnit: 1,
      carbsPerUnit: 0,
      fatPerUnit: 0,
      proteinPerUnit: 0,
    });
    const res = await agent.delete(`/api/ingredients/${create.body.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 409 when ingredient is locked', async () => {
    const agent = await getAgent();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: 'testuser2' } });
    const ing = await prisma.ingredient.create({
      data: { name: 'LockedDel', strictUnit: 'Grams', caloriesPerUnit: 1, carbsPerUnit: 0, fatPerUnit: 0, proteinPerUnit: 0 },
    });
    const recipe = await prisma.recipe.create({ data: { title: 'DelLockRecipe', userId: user.id } });
    await prisma.recipeIngredient.create({ data: { recipeId: recipe.id, ingredientId: ing.id, amount: 1 } });

    const res = await agent.delete(`/api/ingredients/${ing.id}`);
    expect(res.status).toBe(409);

    await prisma.recipeIngredient.deleteMany({ where: { ingredientId: ing.id } });
    await prisma.recipe.delete({ where: { id: recipe.id } });
    await prisma.ingredient.delete({ where: { id: ing.id } });
  });
});
