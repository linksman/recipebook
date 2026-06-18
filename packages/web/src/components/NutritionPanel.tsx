import type { NutritionTotals } from '../lib/nutrition';
import styles from './NutritionPanel.module.css';

interface Props {
  totals: NutritionTotals;
}

export default function NutritionPanel({ totals }: Props) {
  return (
    <div className={styles.panel} aria-label="Nutrition summary">
      <div className={styles.header}>
        <span className={styles.headerIcon}>📊</span>
        <p className={styles.title}>Nutrition totals</p>
      </div>
      <div className={styles.grid}>
        <div className={`${styles.item} ${styles.itemCal}`}>
          <span className={styles.icon}>🔥</span>
          <span className={`${styles.value} ${styles.valueCal}`}>{totals.calories.toFixed(0)}</span>
          <span className={styles.label}>Calories</span>
        </div>
        <div className={`${styles.item} ${styles.itemCarb}`}>
          <span className={styles.icon}>🌾</span>
          <span className={`${styles.value} ${styles.valueCarb}`}>{totals.carbs.toFixed(1)}g</span>
          <span className={styles.label}>Carbs</span>
        </div>
        <div className={`${styles.item} ${styles.itemFat}`}>
          <span className={styles.icon}>🫒</span>
          <span className={`${styles.value} ${styles.valueFat}`}>{totals.fat.toFixed(1)}g</span>
          <span className={styles.label}>Fat</span>
        </div>
        <div className={`${styles.item} ${styles.itemProt}`}>
          <span className={styles.icon}>💪</span>
          <span className={`${styles.value} ${styles.valueProt}`}>{totals.protein.toFixed(1)}g</span>
          <span className={styles.label}>Protein</span>
        </div>
      </div>
    </div>
  );
}
