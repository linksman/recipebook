export interface Ingredient {
  id: string;
  name: string;
  strictUnit: string;
  caloriesPerUnit: number;
  carbsPerUnit: number;
  fatPerUnit: number;
  proteinPerUnit: number;
  isLocked: boolean;
}

export interface IngredientInput {
  name: string;
  strictUnit: string;
  caloriesPerUnit: number;
  carbsPerUnit: number;
  fatPerUnit: number;
  proteinPerUnit: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string>
  ) {
    super(message);
  }
}

async function parseError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => ({}));
  return new ApiError(body.error ?? 'Request failed', res.status, body.errors);
}

export async function fetchIngredients(): Promise<Ingredient[]> {
  const res = await fetch('/api/ingredients');
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function createIngredient(data: IngredientInput): Promise<Ingredient> {
  const res = await fetch('/api/ingredients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function updateIngredient(id: string, data: IngredientInput): Promise<Ingredient> {
  const res = await fetch(`/api/ingredients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function deleteIngredient(id: string): Promise<void> {
  const res = await fetch(`/api/ingredients/${id}`, { method: 'DELETE' });
  if (!res.ok) throw await parseError(res);
}
