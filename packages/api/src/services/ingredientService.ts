import { prisma } from '../db';

export async function isIngredientLocked(ingredientId: string): Promise<boolean> {
  const count = await prisma.recipeIngredient.count({ where: { ingredientId } });
  return count > 0;
}
