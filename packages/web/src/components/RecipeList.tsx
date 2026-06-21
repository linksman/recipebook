import { useNavigate } from 'react-router-dom';
import type { Recipe } from '../api/recipes';
import styles from '../pages/RecipeListPage.module.css';

interface Props {
  recipes: Recipe[];
  loading: boolean;
  error: string;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

function EyeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

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

export default function RecipeList({ recipes, loading, error, onDelete }: Props) {
  const navigate = useNavigate();

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
          <div key={r.id} className={styles.card}>
            <div className={styles.cardImage} onClick={() => navigate(`/recipes/${r.id}`)}>
              {r.imageUrl ? (
                <img src={r.imageUrl} alt={r.title} className={styles.cardImg} />
              ) : (
                <div className={styles.imagePlaceholder} style={{ background: getGradient(r.id) }}>
                  <span>🍽</span>
                </div>
              )}
            </div>

            <div className={styles.cardBody} onClick={() => navigate(`/recipes/${r.id}`)}>

              <h2 className={styles.cardTitle}>{r.title}</h2>
              {r.description && <p className={styles.cardDesc}>{r.description}</p>}
            </div>

            <div className={styles.cardActions}>
              <button
                className={styles.btnView}
                onClick={() => navigate(`/recipes/${r.id}`)}
              >
                <EyeIcon /> View
              </button>
              <button
                className={styles.btnEdit}
                onClick={() => navigate(`/recipes/${r.id}?edit=true`)}
              >
                <EditIcon /> Edit
              </button>
              <button
                className={styles.btnDelete}
                onClick={(e) => onDelete(e, r.id)}
              >
                <TrashIcon /> Delete
              </button>
            </div>
          </div>
      ))}
    </div>
  );
}
