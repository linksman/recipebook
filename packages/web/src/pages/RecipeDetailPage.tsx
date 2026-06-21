import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { fetchRecipe, updateRecipe } from '../api/recipes';
import type { Recipe, RecipeInput } from '../api/recipes';
import { fetchIngredients } from '../api/ingredients';
import type { Ingredient } from '../api/ingredients';
import RecipeForm from '../components/RecipeForm';
import NutritionPanel from '../components/NutritionPanel';
import Modal from '../components/Modal';
import { calculateNutrition } from '../lib/nutrition';
import styles from './RecipeDetailPage.module.css';

const PLACEHOLDER_GRADIENTS = [
  ['#fef3c7', '#fde68a'],
  ['#dbeafe', '#bfdbfe'],
  ['#d1fae5', '#a7f3d0'],
  ['#fce7f3', '#fbcfe8'],
  ['#ede9fe', '#ddd6fe'],
  ['#ffedd5', '#fed7aa'],
];

function getGradient(id: string) {
  const idx = (id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % PLACEHOLDER_GRADIENTS.length;
  const [from, to] = PLACEHOLDER_GRADIENTS[idx];
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
}

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(searchParams.get('edit') === 'true');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetchRecipe(id)
        .then(setRecipe)
        .catch((err) => setError((err as Error).message ?? 'Failed to load recipe')),
      fetchIngredients().then(setIngredients).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [id]);

  async function handleSave(data: RecipeInput) {
    if (!id) return;
    const updated = await updateRecipe(id, data);
    setRecipe(updated);
    setShowEdit(false);
  }

  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (error)   return <p className={styles.error}>{error}</p>;

  return (
    <>
      <nav className={styles.breadcrumb}>
        <Link to="/recipes" className={styles.backLink}>← Recipes</Link>
        {recipe && (
          <>
            <span>/</span>
            <span>{recipe.title}</span>
          </>
        )}
      </nav>

      {recipe && (
        <>
          <div className={styles.hero}>
            {recipe.imageUrl ? (
              <img src={recipe.imageUrl} alt={recipe.title} className={styles.heroImg} />
            ) : (
              <div className={styles.heroPlaceholder} style={{ background: getGradient(recipe.id) }}>
                <span>🍽</span>
              </div>
            )}
          </div>

          <div className={styles.viewHeader}>
            <h1 className={styles.title}>{recipe.title}</h1>
            <button className={styles.btnEdit} onClick={() => setShowEdit(true)}>
              ✎ Edit
            </button>
          </div>

          {recipe.description && (
            <p className={styles.description}>{recipe.description}</p>
          )}

          <NutritionPanel totals={calculateNutrition(recipe.ingredients)} />

          {recipe.ingredients.length > 0 && (
            <div className={styles.section} style={{ marginTop: '1.25rem' }}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>🥬</span>
                <h2 className={styles.sectionTitle}>Ingredients</h2>
              </div>
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
                      <td style={{ color: 'var(--text-muted)' }}>{ri.stageNote ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {recipe.steps.length > 0 && (
            <div className={styles.section} style={{ marginTop: '1.25rem' }}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>📋</span>
                <h2 className={styles.sectionTitle}>Steps</h2>
              </div>
              <ol className={styles.stepList}>
                {recipe.steps.map((s) => (
                  <li key={s.id} className={styles.stepItem}>
                    <span className={styles.stepBadge}>{s.stepNumber}</span>
                    <span className={styles.stepText}>{s.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title={`Edit: ${recipe?.title ?? ''}`}
        size="lg"
      >
        <RecipeForm
          initialRecipe={recipe ?? undefined}
          availableIngredients={ingredients}
          onSave={handleSave}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>
    </>
  );
}
