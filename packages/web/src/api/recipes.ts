import type { Ingredient } from './ingredients';

export interface RecipeIngredientDetail {
  id: string;
  amount: number;
  stageNote: string | null;
  ingredient: Omit<Ingredient, 'isLocked'>;
}

export interface RecipeStep {
  id: string;
  stepNumber: number;
  text: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredientDetail[];
  steps: RecipeStep[];
}

export interface RecipeInput {
  title: string;
  description?: string;
  ingredients: Array<{ ingredientId: string; amount: number; stageNote?: string }>;
  steps: Array<{ stepNumber: number; text: string }>;
}

export class RecipeApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string>
  ) {
    super(message);
  }
}

async function parseError(res: Response): Promise<RecipeApiError> {
  const body = await res.json().catch(() => ({}));
  return new RecipeApiError(body.error ?? 'Request failed', res.status, body.errors);
}

export async function fetchRecipes(): Promise<Recipe[]> {
  const res = await fetch('/api/recipes');
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function fetchRecipe(id: string): Promise<Recipe> {
  const res = await fetch(`/api/recipes/${id}`);
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function createRecipe(data: RecipeInput): Promise<Recipe> {
  const res = await fetch('/api/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function updateRecipe(id: string, data: RecipeInput): Promise<Recipe> {
  const res = await fetch(`/api/recipes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function deleteRecipe(id: string): Promise<void> {
  const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw await parseError(res);
}
