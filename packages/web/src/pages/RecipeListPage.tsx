import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRecipes, createRecipe, deleteRecipe } from '../api/recipes';
import type { Recipe, RecipeInput } from '../api/recipes';
import { fetchIngredients } from '../api/ingredients';
import type { Ingredient } from '../api/ingredients';
import RecipeList from '../components/RecipeList';
import RecipeForm from '../components/RecipeForm';
import Modal from '../components/Modal';
import styles from './RecipeListPage.module.css';

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

export default function RecipeListPage() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchRecipes()
      .then(setRecipes)
      .catch(() => setError('Failed to load recipes'))
      .finally(() => setLoading(false));
    fetchIngredients().then(setIngredients).catch(() => {});
  }, []);

  const filteredRecipes = recipes.filter((r) => {
    const q = search.toLowerCase();
    return r.title.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q);
  });

  async function handleCreate(data: RecipeInput) {
    const created = await createRecipe(data);
    setShowNew(false);
    navigate(`/recipes/${created.id}`);
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this recipe?')) return;
    setDeleteError('');
    try {
      await deleteRecipe(id);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setDeleteError('Failed to delete recipe. Please try again.');
    }
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Recipe Planner – My Culinary Collection</h1>
        <div className={styles.headerControls}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}><SearchIcon /></span>
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Search recipes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className={styles.btnNew} onClick={() => setShowNew(true)}>
            Create New Recipe
          </button>
        </div>
      </div>

      {deleteError && (
        <p className={styles.error} role="alert">{deleteError}</p>
      )}

      <RecipeList
        recipes={filteredRecipes}
        loading={loading}
        error={error}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        title="New Recipe"
        size="lg"
      >
        <RecipeForm
          availableIngredients={ingredients}
          onSave={handleCreate}
          onCancel={() => setShowNew(false)}
        />
      </Modal>
    </>
  );
}
