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
  if (loading) return <p className={styles.loading}>Loading recipes…</p>;
  if (error) return <p className={styles.error} role="alert">{error}</p>;
  if (recipes.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📖</span>
        No recipes yet — create your first one!
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {recipes.map((r) => (
        <Link key={r.id} to={`/recipes/${r.id}`} className={styles.card}>
          <div className={styles.cardStripe} />
          <div className={styles.cardBody}>
            <h2 className={styles.cardTitle}>{r.title}</h2>
            {r.description && <p className={styles.cardDesc}>{r.description}</p>}
          </div>
          <div className={styles.cardFooter}>
            <div className={styles.cardMeta}>
              <span className={styles.metaChipCal}>🔥 {Math.round(calcCalories(r))} kcal</span>
              <span className={styles.metaChip}>
                {r.ingredients.length} ingredient{r.ingredients.length !== 1 ? 's' : ''}
              </span>
              <span className={styles.metaChip}>
                {r.steps.length} step{r.steps.length !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              className={styles.btnDelete}
              onClick={(e) => onDelete(e, r.id)}
              title="Delete recipe"
            >
              ✕
            </button>
          </div>
        </Link>
      ))}
    </div>
  );
}
