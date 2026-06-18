import type { Ingredient } from '../api/ingredients';
import styles from './IngredientList.module.css';

interface Props {
  ingredients: Ingredient[];
  onEdit: (ingredient: Ingredient) => void;
  onDelete: (id: string) => void;
}

export default function IngredientList({ ingredients, onEdit, onDelete }: Props) {
  if (ingredients.length === 0) {
    return <p className={styles.empty}>No ingredients yet — add one to get started.</p>;
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Unit</th>
            <th>Calories</th>
            <th>Carbs</th>
            <th>Fat</th>
            <th>Protein</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ing) => (
            <tr key={ing.id}>
              <td>
                <span className={styles.nameCell}>
                  {ing.isLocked && (
                    <span className={styles.lockIcon} title="Used in a recipe — cannot be modified">
                      🔒
                    </span>
                  )}
                  {ing.name}
                </span>
              </td>
              <td>{ing.strictUnit}</td>
              <td>{ing.caloriesPerUnit}</td>
              <td>{ing.carbsPerUnit}</td>
              <td>{ing.fatPerUnit}</td>
              <td>{ing.proteinPerUnit}</td>
              <td>
                <span className={styles.actions}>
                  <button
                    className={styles.btn}
                    onClick={() => onEdit(ing)}
                    disabled={ing.isLocked}
                    title={ing.isLocked ? 'Used in a recipe' : 'Edit'}
                  >
                    Edit
                  </button>
                  <button
                    className={styles.btnDanger}
                    onClick={() => onDelete(ing.id)}
                    disabled={ing.isLocked}
                    title={ing.isLocked ? 'Used in a recipe' : 'Delete'}
                  >
                    Delete
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
