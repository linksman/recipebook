import { Router } from 'express';
import { prisma } from '../db';

const router = Router();

const recipeInclude = {
  ingredients: {
    include: { ingredient: true },
    orderBy: { id: 'asc' as const },
  },
  steps: {
    orderBy: { stepNumber: 'asc' as const },
  },
};

function validateRecipeBody(body: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    errors.title = 'Title is required';
  }

  const ingredients = Array.isArray(body.ingredients) ? body.ingredients : [];
  for (let i = 0; i < ingredients.length; i++) {
    const item = ingredients[i] as Record<string, unknown>;
    if (!item.ingredientId || typeof item.ingredientId !== 'string') {
      errors[`ingredients[${i}].ingredientId`] = 'Ingredient is required';
    }
    if (typeof item.amount !== 'number' || isNaN(item.amount) || item.amount <= 0) {
      errors[`ingredients[${i}].amount`] = 'Amount must be greater than 0';
    }
  }

  const steps = Array.isArray(body.steps) ? body.steps : [];
  const stepNumbers = new Set<number>();
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i] as Record<string, unknown>;
    if (!step.text || typeof step.text !== 'string' || !step.text.trim()) {
      errors[`steps[${i}].text`] = 'Step text is required';
    }
    if (typeof step.stepNumber !== 'number' || !Number.isInteger(step.stepNumber) || step.stepNumber < 1) {
      errors[`steps[${i}].stepNumber`] = 'Step number must be a positive integer';
    } else if (stepNumbers.has(step.stepNumber)) {
      errors[`steps[${i}].stepNumber`] = 'Step numbers must be unique within a recipe';
    } else {
      stepNumbers.add(step.stepNumber);
    }
  }

  return errors;
}

router.get('/', async (req, res) => {
  const recipes = await prisma.recipe.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    include: recipeInclude,
  });
  res.json(recipes);
});

router.get('/:id', async (req, res) => {
  const recipe = await prisma.recipe.findUnique({
    where: { id: req.params.id },
    include: recipeInclude,
  });
  if (!recipe) { res.status(404).json({ error: 'Recipe not found' }); return; }
  if (recipe.userId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }
  res.json(recipe);
});

router.post('/', async (req, res) => {
  const errors = validateRecipeBody(req.body ?? {});
  if (Object.keys(errors).length > 0) { res.status(422).json({ errors }); return; }

  const { title, description, ingredients = [], steps = [] } = req.body;

  const recipe = await prisma.$transaction(async (tx) => {
    return tx.recipe.create({
      data: {
        userId: req.user!.id,
        title: (title as string).trim(),
        description: (description as string | undefined)?.trim() ?? null,
        ingredients: {
          create: (ingredients as Array<{ ingredientId: string; amount: number; stageNote?: string }>).map((item) => ({
            ingredientId: item.ingredientId,
            amount: item.amount,
            stageNote: item.stageNote ?? null,
          })),
        },
        steps: {
          create: (steps as Array<{ stepNumber: number; text: string }>).map((step) => ({
            stepNumber: step.stepNumber,
            text: step.text.trim(),
          })),
        },
      },
      include: recipeInclude,
    });
  });

  res.status(201).json(recipe);
});

router.put('/:id', async (req, res) => {
  const existing = await prisma.recipe.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: 'Recipe not found' }); return; }
  if (existing.userId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }

  const errors = validateRecipeBody(req.body ?? {});
  if (Object.keys(errors).length > 0) { res.status(422).json({ errors }); return; }

  const { title, description, ingredients = [], steps = [] } = req.body;

  const recipe = await prisma.$transaction(async (tx) => {
    await tx.recipeIngredient.deleteMany({ where: { recipeId: req.params.id } });
    await tx.recipeStep.deleteMany({ where: { recipeId: req.params.id } });
    return tx.recipe.update({
      where: { id: req.params.id },
      data: {
        title: (title as string).trim(),
        description: (description as string | undefined)?.trim() ?? null,
        ingredients: {
          create: (ingredients as Array<{ ingredientId: string; amount: number; stageNote?: string }>).map((item) => ({
            ingredientId: item.ingredientId,
            amount: item.amount,
            stageNote: item.stageNote ?? null,
          })),
        },
        steps: {
          create: (steps as Array<{ stepNumber: number; text: string }>).map((step) => ({
            stepNumber: step.stepNumber,
            text: step.text.trim(),
          })),
        },
      },
      include: recipeInclude,
    });
  });

  res.json(recipe);
});

router.delete('/:id', async (req, res) => {
  const existing = await prisma.recipe.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: 'Recipe not found' }); return; }
  if (existing.userId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }
  await prisma.recipe.delete({ where: { id: req.params.id } });
  res.sendStatus(204);
});

export default router;
