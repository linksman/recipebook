import { Router } from 'express';
import { prisma } from '../db';
import { isIngredientLocked } from '../services/ingredientService';

const router = Router();

const VALID_UNITS = ['Grams', 'Milliliters', 'Units', 'Package'];

function validateIngredientBody(body: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    errors.name = 'Name is required';
  }
  if (!body.strictUnit || !VALID_UNITS.includes(body.strictUnit as string)) {
    errors.strictUnit = `Must be one of: ${VALID_UNITS.join(', ')}`;
  }
  for (const field of ['caloriesPerUnit', 'carbsPerUnit', 'fatPerUnit', 'proteinPerUnit'] as const) {
    const val = body[field];
    if (typeof val !== 'number' || isNaN(val)) {
      errors[field] = 'Must be a number';
    } else if (val < 0) {
      errors[field] = 'Must be 0 or greater';
    }
  }
  return errors;
}

router.get('/', async (_req, res) => {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { recipeItems: true } } },
  });
  res.json(
    ingredients.map(({ _count, ...ing }) => ({
      ...ing,
      isLocked: _count.recipeItems > 0,
    }))
  );
});

router.post('/', async (req, res) => {
  const errors = validateIngredientBody(req.body ?? {});
  if (Object.keys(errors).length > 0) {
    res.status(422).json({ errors });
    return;
  }
  try {
    const ingredient = await prisma.ingredient.create({
      data: {
        name: (req.body.name as string).trim(),
        strictUnit: req.body.strictUnit as string,
        caloriesPerUnit: req.body.caloriesPerUnit as number,
        carbsPerUnit: req.body.carbsPerUnit as number,
        fatPerUnit: req.body.fatPerUnit as number,
        proteinPerUnit: req.body.proteinPerUnit as number,
      },
      include: { _count: { select: { recipeItems: true } } },
    });
    const { _count, ...rest } = ingredient;
    res.status(201).json({ ...rest, isLocked: _count.recipeItems > 0 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      res.status(409).json({ error: 'An ingredient with that name already exists' });
      return;
    }
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  if (await isIngredientLocked(id)) {
    res.status(409).json({ error: 'Ingredient is used in a recipe and cannot be modified' });
    return;
  }
  const errors = validateIngredientBody(req.body ?? {});
  if (Object.keys(errors).length > 0) {
    res.status(422).json({ errors });
    return;
  }
  try {
    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: {
        name: (req.body.name as string).trim(),
        strictUnit: req.body.strictUnit as string,
        caloriesPerUnit: req.body.caloriesPerUnit as number,
        carbsPerUnit: req.body.carbsPerUnit as number,
        fatPerUnit: req.body.fatPerUnit as number,
        proteinPerUnit: req.body.proteinPerUnit as number,
      },
      include: { _count: { select: { recipeItems: true } } },
    });
    const { _count, ...rest } = ingredient;
    res.json({ ...rest, isLocked: _count.recipeItems > 0 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      res.status(409).json({ error: 'An ingredient with that name already exists' });
      return;
    }
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (await isIngredientLocked(id)) {
    res.status(409).json({ error: 'Ingredient is used in a recipe and cannot be deleted' });
    return;
  }
  await prisma.ingredient.delete({ where: { id } });
  res.sendStatus(204);
});

export default router;
