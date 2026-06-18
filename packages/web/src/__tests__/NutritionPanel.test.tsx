import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NutritionPanel from '../components/NutritionPanel';
import RecipeForm from '../components/RecipeForm';
import type { Ingredient } from '../api/ingredients';

const mockIngredients: Ingredient[] = [
  {
    id: 'ing1',
    name: 'Flour',
    strictUnit: 'Grams',
    caloriesPerUnit: 4,
    carbsPerUnit: 0.8,
    fatPerUnit: 0.01,
    proteinPerUnit: 0.1,
    isLocked: false,
  },
];

describe('NutritionPanel', () => {
  it('displays correct values for known inputs', () => {
    render(<NutritionPanel totals={{ calories: 728, carbs: 152, fat: 2, protein: 20 }} />);
    expect(screen.getByText('728.0')).toBeInTheDocument();
    expect(screen.getByText('152.0')).toBeInTheDocument();
    expect(screen.getByText('2.0')).toBeInTheDocument();
    expect(screen.getByText('20.0')).toBeInTheDocument();
  });

  it('shows "Total for entire recipe" label', () => {
    render(<NutritionPanel totals={{ calories: 0, carbs: 0, fat: 0, protein: 0 }} />);
    expect(screen.getByText(/total for entire recipe/i)).toBeInTheDocument();
  });
});

describe('RecipeForm + NutritionPanel integration', () => {
  it('nutrition panel updates immediately when amount changes — no async delay', async () => {
    render(
      <RecipeForm
        availableIngredients={mockIngredients}
        onSave={async () => {}}
        onCancel={() => {}}
      />
    );

    // Add ingredient and select Flour
    await userEvent.click(screen.getByRole('button', { name: /add ingredient/i }));
    await userEvent.selectOptions(screen.getByRole('combobox'), 'ing1');

    // Type 100 → expect calories 400 (100 × 4)
    const amountInput = screen.getByLabelText(/amount 1/i);
    await userEvent.type(amountInput, '100');

    // Panel value is computed inline on render — no await needed
    expect(screen.getByText('400.0')).toBeInTheDocument();
  });
});
