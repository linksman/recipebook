import { Link } from 'react-router-dom';
import type { Recipe } from '../api/recipes';
import styles from '../pages/RecipeListPage.module.css';

interface Props {
  recipes: Recipe[];
  loading: boolean;
  error: string;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

function calcCalories(recipe: Recipe): number {
  return recipe.ingredients.reduce((sum, ri) => sum + ri.amount * ri.ingredient.caloriesPerUnit, 0);
}

export default function RecipeList({ recipes, loading, error, onDelete }: Props) {
  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (error) return <p className={styles.error} role="alert">{error}</p>;
  if (recipes.length === 0) return <p className={styles.empty}>No recipes yet — create your first one!</p>;

  return (
    <div className={styles.grid}>
      {recipes.map((r) => (
        <Link key={r.id} to={`/recipes/${r.id}`} className={styles.card}>
          <h2 className={styles.cardTitle}>{r.title}</h2>
          {r.description && <p className={styles.cardDesc}>{r.description}</p>}
          <div className={styles.cardMeta}>
            <span>{Math.round(calcCalories(r))} kcal</span>
            <span>{r.ingredients.length} ingredient{r.ingredients.length !== 1 ? 's' : ''}</span>
            <span>{r.steps.length} step{r.steps.length !== 1 ? 's' : ''}</span>
            <button
              onClick={(e) => onDelete(e, r.id)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Delete
            </button>
          </div>
        </Link>
      ))}
    </div>
  );
}
