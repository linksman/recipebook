import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipeStep.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('FK constraint: RecipeIngredient.ingredientId', () => {
  it('rejects a non-existent ingredientId', async () => {
    const user = await prisma.user.create({
      data: { username: 'test', passwordHash: 'x' },
    });
    const recipe = await prisma.recipe.create({
      data: { userId: user.id, title: 'Test Recipe' },
    });

    await expect(
      prisma.recipeIngredient.create({
        data: {
          recipeId: recipe.id,
          ingredientId: 'does-not-exist',
          amount: 100,
        },
      })
    ).rejects.toThrow();
  });
});

describe('Schema: RecipeIngredient.amount is required', () => {
  it('rejects null amount', async () => {
    const user = await prisma.user.create({
      data: { username: 'test', passwordHash: 'x' },
    });
    const recipe = await prisma.recipe.create({
      data: { userId: user.id, title: 'Test Recipe' },
    });
    const ingredient = await prisma.ingredient.create({
      data: {
        name: 'Flour',
        strictUnit: 'Grams',
        caloriesPerUnit: 3.64,
        carbsPerUnit: 0.76,
        fatPerUnit: 0.01,
        proteinPerUnit: 0.10,
      },
    });

    await expect(
      prisma.recipeIngredient.create({
        data: {
          recipeId: recipe.id,
          ingredientId: ingredient.id,
          amount: null as unknown as number,
        },
      })
    ).rejects.toThrow();
  });
});

describe('Seed: user creation', () => {
  it('inserts exactly one user with a valid bcrypt hash', async () => {
    const passwordHash = await bcrypt.hash('password', 10);
    await prisma.user.create({ data: { username: 'admin', passwordHash } });

    const users = await prisma.user.findMany();
    expect(users).toHaveLength(1);
    expect(users[0].username).toBe('admin');
    expect(await bcrypt.compare('password', users[0].passwordHash)).toBe(true);
  });
});
