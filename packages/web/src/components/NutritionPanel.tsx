import type { NutritionTotals } from '../lib/nutrition';
import styles from './NutritionPanel.module.css';

interface Props {
  totals: NutritionTotals;
}

export default function NutritionPanel({ totals }: Props) {
  return (
    <div className={styles.panel} aria-label="Nutrition summary">
      <p className={styles.title}>Total for entire recipe</p>
      <div className={styles.grid}>
        <div className={styles.item}>
          <span className={styles.value}>{totals.calories.toFixed(1)}</span>
          <span className={styles.label}>Calories</span>
        </div>
        <div className={styles.item}>
          <span className={styles.value}>{totals.carbs.toFixed(1)}</span>
          <span className={styles.label}>Carbs (g)</span>
        </div>
        <div className={styles.item}>
          <span className={styles.value}>{totals.fat.toFixed(1)}</span>
          <span className={styles.label}>Fat (g)</span>
        </div>
        <div className={styles.item}>
          <span className={styles.value}>{totals.protein.toFixed(1)}</span>
          <span className={styles.label}>Protein (g)</span>
        </div>
      </div>
    </div>
  );
}
