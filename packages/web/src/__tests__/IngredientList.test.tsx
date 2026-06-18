import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import IngredientList from '../components/IngredientList';
import type { Ingredient } from '../api/ingredients';

function makeIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id: '1',
    name: 'Flour',
    strictUnit: 'Grams',
    caloriesPerUnit: 3.5,
    carbsPerUnit: 0.7,
    fatPerUnit: 0.01,
    proteinPerUnit: 0.1,
    isLocked: false,
    ...overrides,
  };
}

describe('IngredientList', () => {
  it('shows empty message when list is empty', () => {
    render(<IngredientList ingredients={[]} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(/no ingredients yet/i)).toBeInTheDocument();
  });

  it('renders ingredient row with name and unit', () => {
    render(<IngredientList ingredients={[makeIngredient()]} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Flour')).toBeInTheDocument();
    expect(screen.getByText('Grams')).toBeInTheDocument();
  });

  it('disables Edit and Delete buttons for locked ingredient', () => {
    render(
      <IngredientList ingredients={[makeIngredient({ isLocked: true })]} onEdit={() => {}} onDelete={() => {}} />
    );
    expect(screen.getByRole('button', { name: /edit/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled();
  });

  it('enables Edit and Delete buttons for unlocked ingredient', () => {
    render(
      <IngredientList ingredients={[makeIngredient({ isLocked: false })]} onEdit={() => {}} onDelete={() => {}} />
    );
    expect(screen.getByRole('button', { name: /edit/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /delete/i })).not.toBeDisabled();
  });
});
