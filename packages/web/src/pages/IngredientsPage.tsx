import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteIngredient, fetchIngredients, ApiError } from '../api/ingredients';
import type { Ingredient } from '../api/ingredients';
import IngredientList from '../components/IngredientList';
import IngredientForm from '../components/IngredientForm';
import { useAuth } from '../context/AuthContext';
import styles from './IngredientsPage.module.css';

type Mode = { type: 'list' } | { type: 'add' } | { type: 'edit'; ingredient: Ingredient };

export default function IngredientsPage() {
  const { logout } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [mode, setMode] = useState<Mode>({ type: 'list' });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchIngredients()
      .then(setIngredients)
      .catch(() => setFetchError('Failed to load ingredients'))
      .finally(() => setLoading(false));
  }, []);

  function handleSuccess(ingredient: Ingredient) {
    setIngredients((prev) => {
      const exists = prev.find((i) => i.id === ingredient.id);
      return exists
        ? prev.map((i) => (i.id === ingredient.id ? ingredient : i))
        : [...prev, ingredient].sort((a, b) => a.name.localeCompare(b.name));
    });
    setMode({ type: 'list' });
  }

  async function handleDelete(id: string) {
    setActionError('');
    try {
      await deleteIngredient(id);
      setIngredients((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to delete ingredient');
    }
  }

  const filtered = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/recipes" className={styles.navLink}>← Recipes</Link>
        <button onClick={logout} className={styles.navLogout}>Logout</button>
      </nav>

      <div className={styles.header}>
        <h1 className={styles.title}>Ingredients</h1>
        <div className={styles.headerRight}>
          <input
            className={styles.search}
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className={styles.btnAdd}
            onClick={() => { setMode({ type: 'add' }); setActionError(''); }}
          >
            + Add Ingredient
          </button>
        </div>
      </div>

      {(mode.type === 'add' || mode.type === 'edit') && (
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>
            {mode.type === 'add' ? 'New Ingredient' : 'Edit Ingredient'}
          </h2>
          <IngredientForm
            initial={mode.type === 'edit' ? mode.ingredient : undefined}
            onSuccess={handleSuccess}
            onCancel={() => setMode({ type: 'list' })}
          />
        </div>
      )}

      {actionError && <p className={styles.error} role="alert">{actionError}</p>}

      {loading ? (
        <p className={styles.loading}>Loading…</p>
      ) : fetchError ? (
        <p className={styles.error}>{fetchError}</p>
      ) : (
        <div className={styles.tableCard}>
          <IngredientList
            ingredients={filtered}
            onEdit={(ing) => { setMode({ type: 'edit', ingredient: ing }); setActionError(''); }}
            onDelete={handleDelete}
          />
        </div>
      )}
    </div>
  );
}
