import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeForm from '../components/RecipeForm';
import type { Ingredient } from '../api/ingredients';

const mockIngredients: Ingredient[] = [
  { id: 'ing1', name: 'Flour', strictUnit: 'Grams', caloriesPerUnit: 3.5, carbsPerUnit: 0.7, fatPerUnit: 0.01, proteinPerUnit: 0.1, isLocked: false },
  { id: 'ing2', name: 'Milk', strictUnit: 'Milliliters', caloriesPerUnit: 0.6, carbsPerUnit: 0.05, fatPerUnit: 0.03, proteinPerUnit: 0.03, isLocked: false },
];

const noop = async () => {};

describe('RecipeForm', () => {
  it('adding the same ingredient twice renders two separate line item rows', async () => {
    render(<RecipeForm availableIngredients={mockIngredients} onSave={noop} onCancel={() => {}} />);

    const addBtn = screen.getByRole('button', { name: /add ingredient/i });
    await userEvent.click(addBtn);
    await userEvent.click(addBtn);

    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it('shows the strictUnit label next to the amount field when ingredient selected', async () => {
    render(<RecipeForm availableIngredients={mockIngredients} onSave={noop} onCancel={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: /add ingredient/i }));
    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, 'ing1');

    expect(screen.getByText('Grams')).toBeInTheDocument();
  });

  it('each line item has no unit conversion controls', async () => {
    render(<RecipeForm availableIngredients={mockIngredients} onSave={noop} onCancel={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /add ingredient/i }));

    expect(screen.queryByRole('button', { name: /convert/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /unit/i })).not.toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(<RecipeForm availableIngredients={mockIngredients} onSave={noop} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
