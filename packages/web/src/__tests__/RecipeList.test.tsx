import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecipeList from '../components/RecipeList';
import type { Recipe } from '../api/recipes';

const noop = () => {};

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: '1',
    title: 'Test Recipe',
    description: 'A tasty dish',
    imageUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ingredients: [],
    steps: [],
    ...overrides,
  };
}

function renderList(props: Partial<Parameters<typeof RecipeList>[0]> = {}) {
  return render(
    <MemoryRouter>
      <RecipeList recipes={[]} loading={false} error="" onDelete={noop} {...props} />
    </MemoryRouter>
  );
}

describe('RecipeList', () => {
  it('shows a spinner/loading text while loading', () => {
    renderList({ loading: true });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows empty state message when no recipes', () => {
    renderList({ loading: false, recipes: [] });
    expect(screen.getByText(/no recipes yet/i)).toBeInTheDocument();
  });

  it('shows error message when error prop is set', () => {
    renderList({ loading: false, error: 'Failed to load recipes' });
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load recipes');
  });

  it('renders recipe cards when recipes are provided', () => {
    const recipes = [
      makeRecipe({ id: '1', title: 'Pancakes' }),
      makeRecipe({ id: '2', title: 'Omelette' }),
    ];
    renderList({ recipes });
    expect(screen.getByText('Pancakes')).toBeInTheDocument();
    expect(screen.getByText('Omelette')).toBeInTheDocument();
  });

  it('shows calorie count for each recipe', () => {
    const recipe = makeRecipe({
      ingredients: [{
        id: 'ri1',
        amount: 100,
        stageNote: null,
        ingredient: { id: 'i1', name: 'Flour', strictUnit: 'Grams', caloriesPerUnit: 3.64, carbsPerUnit: 0.76, fatPerUnit: 0.01, proteinPerUnit: 0.1 },
      }],
    });
    renderList({ recipes: [recipe] });
    expect(screen.getByText(/364 kcal/i)).toBeInTheDocument();
  });
});
