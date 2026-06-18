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

export default function RecipeListPage() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    fetchRecipes()
      .then(setRecipes)
      .catch(() => setError('Failed to load recipes'))
      .finally(() => setLoading(false));
    // prefetch ingredients so the form is ready instantly
    fetchIngredients().then(setIngredients).catch(() => {});
  }, []);

  async function handleCreate(data: RecipeInput) {
    const created = await createRecipe(data);
    setShowNew(false);
    navigate(`/recipes/${created.id}`);
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    if (!confirm('Delete this recipe?')) return;
    await deleteRecipe(id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>My Recipes</h1>
        <button className={styles.btnNew} onClick={() => setShowNew(true)}>
          + New Recipe
        </button>
      </div>

      <RecipeList recipes={recipes} loading={loading} error={error} onDelete={handleDelete} />

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
