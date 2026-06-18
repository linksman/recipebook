import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../app';

const prisma = new PrismaClient();
const app = createApp();

afterAll(() => prisma.$disconnect());

async function makeAgent(username: string, password: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username, password });
  return agent;
}

const recipeBody = (ingredientId: string) => ({
  title: 'Pancakes',
  description: 'Classic pancakes',
  ingredients: [{ ingredientId, amount: 200, stageNote: 'For the batter' }],
  steps: [{ stepNumber: 1, text: 'Mix everything' }],
});

beforeAll(async () => {
  await Promise.all([
    prisma.user.upsert({
      where: { username: 'chef1' },
      update: {},
      create: { username: 'chef1', passwordHash: await bcrypt.hash('pass1', 10) },
    }),
    prisma.user.upsert({
      where: { username: 'chef2' },
      update: {},
      create: { username: 'chef2', passwordHash: await bcrypt.hash('pass2', 10) },
    }),
  ]);
});

describe('Transaction rollback (unit)', () => {
  it('rolls back recipe creation if transaction throws', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { username: 'chef1' } });
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.recipe.create({ data: { userId: user.id, title: 'Should Rollback' } });
        throw new Error('Simulated failure');
      })
    ).rejects.toThrow('Simulated failure');

    const count = await prisma.recipe.count({ where: { title: 'Should Rollback', userId: user.id } });
    expect(count).toBe(0);
  });
});

describe('Ownership check', () => {
  it('GET /api/recipes/:id returns 403 for another user\'s recipe', async () => {
    const ing = await prisma.ingredient.create({
      data: { name: 'OwnerIng', strictUnit: 'Grams', caloriesPerUnit: 1, carbsPerUnit: 0, fatPerUnit: 0, proteinPerUnit: 0 },
    });
    const agent1 = await makeAgent('chef1', 'pass1');
    const create = await agent1.post('/api/recipes').send(recipeBody(ing.id));
    expect(create.status).toBe(201);

    const agent2 = await makeAgent('chef2', 'pass2');
    const res = await agent2.get(`/api/recipes/${create.body.id}`);
    expect(res.status).toBe(403);

    await prisma.recipe.delete({ where: { id: create.body.id } });
    await prisma.ingredient.delete({ where: { id: ing.id } });
  });
});

describe('POST /api/recipes', () => {
  it('creates a recipe and returns 201 with nested data', async () => {
    const ing = await prisma.ingredient.create({
      data: { name: 'PostIng', strictUnit: 'Grams', caloriesPerUnit: 3.5, carbsPerUnit: 0.7, fatPerUnit: 0.01, proteinPerUnit: 0.1 },
    });
    const agent = await makeAgent('chef1', 'pass1');
    const res = await agent.post('/api/recipes').send(recipeBody(ing.id));
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Pancakes');
    expect(res.body.ingredients).toHaveLength(1);
    expect(res.body.steps).toHaveLength(1);
    expect(res.body.ingredients[0].ingredient.name).toBe('PostIng');

    await prisma.recipe.delete({ where: { id: res.body.id } });
    await prisma.ingredient.delete({ where: { id: ing.id } });
  });

  it('allows the same ingredient twice with different stageNotes → two RecipeIngredient rows', async () => {
    const ing = await prisma.ingredient.create({
      data: { name: 'DualStageIng', strictUnit: 'Grams', caloriesPerUnit: 1, carbsPerUnit: 0, fatPerUnit: 0, proteinPerUnit: 0 },
    });
    const agent = await makeAgent('chef1', 'pass1');
    const res = await agent.post('/api/recipes').send({
      title: 'Two-Stage Recipe',
      ingredients: [
        { ingredientId: ing.id, amount: 100, stageNote: 'Stage 1' },
        { ingredientId: ing.id, amount: 50, stageNote: 'Stage 2' },
      ],
      steps: [],
    });
    expect(res.status).toBe(201);
    expect(res.body.ingredients).toHaveLength(2);

    await prisma.recipe.delete({ where: { id: res.body.id } });
    await prisma.ingredient.delete({ where: { id: ing.id } });
  });

  it('returns 422 when an ingredient amount is 0', async () => {
    const ing = await prisma.ingredient.create({
      data: { name: 'ZeroAmtIng', strictUnit: 'Grams', caloriesPerUnit: 1, carbsPerUnit: 0, fatPerUnit: 0, proteinPerUnit: 0 },
    });
    const agent = await makeAgent('chef1', 'pass1');
    const res = await agent.post('/api/recipes').send({
      title: 'Bad Recipe',
      ingredients: [{ ingredientId: ing.id, amount: 0 }],
      steps: [],
    });
    expect(res.status).toBe(422);

    await prisma.ingredient.delete({ where: { id: ing.id } });
  });
});

describe('GET /api/recipes/:id', () => {
  it('returns 200 with full nested detail for own recipe', async () => {
    const ing = await prisma.ingredient.create({
      data: { name: 'GetDetailIng', strictUnit: 'Milliliters', caloriesPerUnit: 0, carbsPerUnit: 0, fatPerUnit: 0, proteinPerUnit: 0 },
    });
    const agent = await makeAgent('chef1', 'pass1');
    const create = await agent.post('/api/recipes').send(recipeBody(ing.id));
    const res = await agent.get(`/api/recipes/${create.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.ingredients[0].ingredient).toHaveProperty('caloriesPerUnit');
    expect(res.body.steps[0].stepNumber).toBe(1);

    await prisma.recipe.delete({ where: { id: create.body.id } });
    await prisma.ingredient.delete({ where: { id: ing.id } });
  });

  it('returns 403 for another user\'s recipe', async () => {
    const ing = await prisma.ingredient.create({
      data: { name: 'ForbiddenIng', strictUnit: 'Units', caloriesPerUnit: 0, carbsPerUnit: 0, fatPerUnit: 0, proteinPerUnit: 0 },
    });
    const agent1 = await makeAgent('chef1', 'pass1');
    const create = await agent1.post('/api/recipes').send(recipeBody(ing.id));

    const agent2 = await makeAgent('chef2', 'pass2');
    const res = await agent2.get(`/api/recipes/${create.body.id}`);
    expect(res.status).toBe(403);

    await prisma.recipe.delete({ where: { id: create.body.id } });
    await prisma.ingredient.delete({ where: { id: ing.id } });
  });
});

describe('PUT /api/recipes/:id', () => {
  it('returns 403 for another user\'s recipe', async () => {
    const ing = await prisma.ingredient.create({
      data: { name: 'PutForbidIng', strictUnit: 'Package', caloriesPerUnit: 0, carbsPerUnit: 0, fatPerUnit: 0, proteinPerUnit: 0 },
    });
    const agent1 = await makeAgent('chef1', 'pass1');
    const create = await agent1.post('/api/recipes').send(recipeBody(ing.id));

    const agent2 = await makeAgent('chef2', 'pass2');
    const res = await agent2.put(`/api/recipes/${create.body.id}`).send({ title: 'Stolen', ingredients: [], steps: [] });
    expect(res.status).toBe(403);

    await prisma.recipe.delete({ where: { id: create.body.id } });
    await prisma.ingredient.delete({ where: { id: ing.id } });
  });
});

describe('DELETE /api/recipes/:id', () => {
  it('returns 204 and cascades to child rows', async () => {
    const ing = await prisma.ingredient.create({
      data: { name: 'DeleteCascadeIng', strictUnit: 'Grams', caloriesPerUnit: 1, carbsPerUnit: 0, fatPerUnit: 0, proteinPerUnit: 0 },
    });
    const agent = await makeAgent('chef1', 'pass1');
    const create = await agent.post('/api/recipes').send(recipeBody(ing.id));
    const recipeId = create.body.id;

    const del = await agent.delete(`/api/recipes/${recipeId}`);
    expect(del.status).toBe(204);

    const get = await agent.get(`/api/recipes/${recipeId}`);
    expect(get.status).toBe(404);

    const orphanIngredients = await prisma.recipeIngredient.count({ where: { recipeId } });
    const orphanSteps = await prisma.recipeStep.count({ where: { recipeId } });
    expect(orphanIngredients).toBe(0);
    expect(orphanSteps).toBe(0);

    await prisma.ingredient.delete({ where: { id: ing.id } });
  });
});

describe('Stage 5 — nutrition fields embedded in recipe response', () => {
  it('GET /api/recipes/:id includes all *PerUnit fields on each line item', async () => {
    const ing = await prisma.ingredient.create({
      data: { name: 'NutIng', strictUnit: 'Grams', caloriesPerUnit: 3.64, carbsPerUnit: 0.76, fatPerUnit: 0.01, proteinPerUnit: 0.10 },
    });
    const agent = await makeAgent('chef1', 'pass1');
    const create = await agent.post('/api/recipes').send(recipeBody(ing.id));
    const res = await agent.get(`/api/recipes/${create.body.id}`);

    expect(res.status).toBe(200);
    const { ingredient } = res.body.ingredients[0];
    expect(ingredient.caloriesPerUnit).toBe(3.64);
    expect(ingredient.carbsPerUnit).toBe(0.76);
    expect(ingredient.fatPerUnit).toBe(0.01);
    expect(ingredient.proteinPerUnit).toBe(0.10);

    await prisma.recipe.delete({ where: { id: create.body.id } });
    await prisma.ingredient.delete({ where: { id: ing.id } });
  });
});
