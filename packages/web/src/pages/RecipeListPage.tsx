import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchRecipes, deleteRecipe } from '../api/recipes';
import type { Recipe } from '../api/recipes';
import { useAuth } from '../context/AuthContext';
import styles from './RecipeListPage.module.css';

function calcCalories(recipe: Recipe): number {
  return recipe.ingredients.reduce((sum, ri) => sum + ri.amount * ri.ingredient.caloriesPerUnit, 0);
}

export default function RecipeListPage() {
  const { logout } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecipes()
      .then(setRecipes)
      .catch(() => setError('Failed to load recipes'))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    if (!confirm('Delete this recipe?')) return;
    await deleteRecipe(id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/ingredients" className={styles.navLink}>Ingredients</Link>
        <button onClick={logout} className={styles.navLogout}>Logout</button>
      </nav>

      <div className={styles.header}>
        <h1 className={styles.title}>My Recipes</h1>
        <Link to="/recipes/new" className={styles.btnNew}>+ New Recipe</Link>
      </div>

      {loading && <p className={styles.loading}>Loading…</p>}
      {error && <p className={styles.error}>{error}</p>}
      {!loading && !error && recipes.length === 0 && (
        <p className={styles.empty}>No recipes yet — create your first one!</p>
      )}
      {!loading && !error && recipes.length > 0 && (
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
                  onClick={(e) => handleDelete(e, r.id)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Delete
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
