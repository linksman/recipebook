import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchRecipes, deleteRecipe } from '../api/recipes';
import type { Recipe } from '../api/recipes';
import RecipeList from '../components/RecipeList';
import { useAuth } from '../context/AuthContext';
import styles from './RecipeListPage.module.css';

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

      <RecipeList recipes={recipes} loading={loading} error={error} onDelete={handleDelete} />
    </div>
  );
}
