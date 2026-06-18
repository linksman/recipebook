import { useEffect, useState } from 'react';
import { deleteIngredient, fetchIngredients, ApiError } from '../api/ingredients';
import type { Ingredient } from '../api/ingredients';
import IngredientList from '../components/IngredientList';
import IngredientForm from '../components/IngredientForm';
import Modal from '../components/Modal';
import styles from './IngredientsPage.module.css';

type EditTarget = Ingredient | null;

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');

  // modal state: null = closed, null value = "add" mode, Ingredient = "edit" mode
  const [modalTarget, setModalTarget] = useState<EditTarget | undefined>(undefined);
  const isModalOpen = modalTarget !== undefined;

  function loadIngredients() {
    setLoading(true);
    setFetchError('');
    fetchIngredients()
      .then(setIngredients)
      .catch(() => setFetchError('Failed to load ingredients'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadIngredients(); }, []);

  function openAdd() { setActionError(''); setModalTarget(null); }
  function openEdit(ing: Ingredient) { setActionError(''); setModalTarget(ing); }
  function closeModal() { setModalTarget(undefined); }

  function handleSuccess(ingredient: Ingredient) {
    setIngredients((prev) => {
      const exists = prev.find((i) => i.id === ingredient.id);
      return exists
        ? prev.map((i) => (i.id === ingredient.id ? ingredient : i))
        : [...prev, ingredient].sort((a, b) => a.name.localeCompare(b.name));
    });
    closeModal();
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
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Ingredients</h1>
        <div className={styles.headerRight}>
          <input
            className={styles.search}
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className={styles.btnAdd} onClick={openAdd}>
            + Add Ingredient
          </button>
        </div>
      </div>

      {actionError && <p className={styles.actionError} role="alert">{actionError}</p>}

      {loading ? (
        <p className={styles.loading}>Loading…</p>
      ) : fetchError ? (
        <div className={styles.error} role="alert">
          {fetchError}
          <button
            onClick={loadIngredients}
            style={{ background: 'none', border: '1px solid #dc2626', borderRadius: '4px', color: '#dc2626', cursor: 'pointer', padding: '0.2rem 0.5rem', fontSize: '0.8rem', flexShrink: 0 }}
          >Retry</button>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <IngredientList
            ingredients={filtered}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalTarget ? `Edit: ${modalTarget.name}` : 'New Ingredient'}
      >
        <IngredientForm
          initial={modalTarget ?? undefined}
          onSuccess={handleSuccess}
          onCancel={closeModal}
        />
      </Modal>
    </>
  );
}
