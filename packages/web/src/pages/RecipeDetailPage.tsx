import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { fetchRecipe, createRecipe, updateRecipe } from '../api/recipes';
import type { Recipe, RecipeInput } from '../api/recipes';
import { fetchIngredients } from '../api/ingredients';
import type { Ingredient } from '../api/ingredients';
import RecipeForm from '../components/RecipeForm';
import NutritionPanel from '../components/NutritionPanel';
import { calculateNutrition } from '../lib/nutrition';
import styles from './RecipeDetailPage.module.css';

type Mode = 'view' | 'edit' | 'create';

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const mode: Mode = !id ? 'create' : location.pathname.endsWith('/edit') ? 'edit' : 'view';

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(mode !== 'create');
  const [error, setError] = useState('');

  useEffect(() => {
    const promises: Promise<unknown>[] = [fetchIngredients().then(setIngredients)];
    if (id) {
      promises.push(
        fetchRecipe(id)
          .then(setRecipe)
          .catch((err) => setError((err as Error).message ?? 'Failed to load recipe'))
      );
    }
    Promise.all(promises).finally(() => setLoading(false));
  }, [id]);

  async function handleSave(data: RecipeInput) {
    if (mode === 'create') {
      const created = await createRecipe(data);
      navigate(`/recipes/${created.id}`);
    } else if (mode === 'edit' && id) {
      const updated = await updateRecipe(id, data);
      setRecipe(updated);
      navigate(`/recipes/${id}`);
    }
  }

  if (loading) return <div className={styles.page}><p className={styles.loading}>Loading…</p></div>;
  if (error) return <div className={styles.page}><p className={styles.error}>{error}</p></div>;

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/recipes" className={styles.navLink}>← Recipes</Link>
      </nav>

      {(mode === 'create' || mode === 'edit') && (
        <div className={styles.formCard}>
          <h1 className={styles.formTitle}>
            {mode === 'create' ? 'New Recipe' : `Edit: ${recipe?.title}`}
          </h1>
          <RecipeForm
            initialRecipe={mode === 'edit' ? recipe ?? undefined : undefined}
            availableIngredients={ingredients}
            onSave={handleSave}
            onCancel={() => navigate(id ? `/recipes/${id}` : '/recipes')}
          />
        </div>
      )}

      {mode === 'view' && recipe && (
        <>
          <div className={styles.header}>
            <h1 className={styles.title}>{recipe.title}</h1>
            <div className={styles.headerActions}>
              <Link to={`/recipes/${recipe.id}/edit`} className={styles.btnEdit}>Edit</Link>
            </div>
          </div>

          {recipe.description && <p className={styles.description}>{recipe.description}</p>}

          <h2 className={styles.sectionTitle}>Ingredients</h2>
          {recipe.ingredients.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>No ingredients.</p>
          ) : (
            <table className={styles.ingredientTable}>
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Amount</th>
                  <th>Stage note</th>
                </tr>
              </thead>
              <tbody>
                {recipe.ingredients.map((ri) => (
                  <tr key={ri.id}>
                    <td>{ri.ingredient.name}</td>
                    <td>{ri.amount} {ri.ingredient.strictUnit}</td>
                    <td>{ri.stageNote ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <NutritionPanel totals={calculateNutrition(recipe.ingredients)} />

          <h2 className={styles.sectionTitle} style={{ marginTop: '1.5rem' }}>Steps</h2>
          {recipe.steps.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>No steps.</p>
          ) : (
            <ol className={styles.stepList}>
              {recipe.steps.map((s) => (
                <li key={s.id} className={styles.stepItem}>
                  <span className={styles.stepBadge}>{s.stepNumber}</span>
                  <span className={styles.stepText}>{s.text}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
