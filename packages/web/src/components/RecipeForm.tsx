import { useState } from 'react';
import type { Recipe, RecipeInput } from '../api/recipes';
import type { Ingredient } from '../api/ingredients';
import { calculateNutrition } from '../lib/nutrition';
import NutritionPanel from './NutritionPanel';
import styles from './RecipeForm.module.css';

interface LineItem {
  _key: string;
  ingredientId: string;
  amount: string;
  stageNote: string;
}

interface StepItem {
  _key: string;
  text: string;
}

interface Props {
  initialRecipe?: Recipe;
  availableIngredients: Ingredient[];
  onSave: (data: RecipeInput) => Promise<void>;
  onCancel: () => void;
}

let _keyCounter = 0;
function newKey() { return String(++_keyCounter); }

function toLineItems(recipe?: Recipe): LineItem[] {
  if (!recipe) return [];
  return recipe.ingredients.map((ri) => ({
    _key: newKey(),
    ingredientId: ri.ingredient.id,
    amount: String(ri.amount),
    stageNote: ri.stageNote ?? '',
  }));
}

function toStepItems(recipe?: Recipe): StepItem[] {
  if (!recipe) return [];
  return recipe.steps.map((s) => ({ _key: newKey(), text: s.text }));
}

export default function RecipeForm({ initialRecipe, availableIngredients, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(initialRecipe?.title ?? '');
  const [description, setDescription] = useState(initialRecipe?.description ?? '');
  const [lineItems, setLineItems] = useState<LineItem[]>(toLineItems(initialRecipe));
  const [steps, setSteps] = useState<StepItem[]>(toStepItems(initialRecipe));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function addLineItem() {
    setLineItems((prev) => [...prev, { _key: newKey(), ingredientId: '', amount: '', stageNote: '' }]);
  }

  function removeLineItem(key: string) {
    setLineItems((prev) => prev.filter((r) => r._key !== key));
  }

  function updateLineItem(key: string, field: keyof Omit<LineItem, '_key'>, value: string) {
    setLineItems((prev) => prev.map((r) => r._key === key ? { ...r, [field]: value } : r));
  }

  function addStep() {
    setSteps((prev) => [...prev, { _key: newKey(), text: '' }]);
  }

  function removeStep(key: string) {
    setSteps((prev) => prev.filter((s) => s._key !== key));
  }

  function updateStep(key: string, text: string) {
    setSteps((prev) => prev.map((s) => s._key === key ? { ...s, text } : s));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner('');
    setFieldErrors({});
    setSubmitting(true);
    try {
      await onSave({
        title,
        description: description || undefined,
        ingredients: lineItems.map((li) => ({
          ingredientId: li.ingredientId,
          amount: parseFloat(li.amount),
          stageNote: li.stageNote || undefined,
        })),
        steps: steps.map((s, i) => ({ stepNumber: i + 1, text: s.text })),
      });
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string>; message?: string };
      if (e.errors) setFieldErrors(e.errors);
      else setBanner(e.message ?? 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {banner && <p className={styles.banner} role="alert">{banner}</p>}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="recipe-title">Title</label>
        <input
          id="recipe-title"
          className={`${styles.input} ${fieldErrors.title ? styles.inputError : ''}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        {fieldErrors.title && <span className={styles.errorMsg}>{fieldErrors.title}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="recipe-desc">Description</label>
        <textarea
          id="recipe-desc"
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Ingredients section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Ingredients</h3>
        </div>
        {lineItems.length === 0 && <p className={styles.empty}>No ingredients added yet.</p>}
        {lineItems.map((li, idx) => {
          const selected = availableIngredients.find((i) => i.id === li.ingredientId);
          const amtKey = `ingredients[${idx}].amount`;
          const ingKey = `ingredients[${idx}].ingredientId`;
          return (
            <div key={li._key}>
              <div className={styles.row}>
                <select
                  aria-label={`Ingredient ${idx + 1}`}
                  className={`${styles.select} ${fieldErrors[ingKey] ? styles.inputError : ''}`}
                  value={li.ingredientId}
                  onChange={(e) => updateLineItem(li._key, 'ingredientId', e.target.value)}
                >
                  <option value="">Select ingredient…</option>
                  {availableIngredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>{ing.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  aria-label={`Amount ${idx + 1}`}
                  className={`${styles.input} ${fieldErrors[amtKey] ? styles.inputError : ''}`}
                  value={li.amount}
                  onChange={(e) => updateLineItem(li._key, 'amount', e.target.value)}
                />
                <span className={styles.unitTag}>{selected?.strictUnit ?? '—'}</span>
                <button
                  type="button"
                  className={styles.btnRemove}
                  onClick={() => removeLineItem(li._key)}
                  aria-label="Remove ingredient"
                >×</button>
              </div>
              <div className={styles.stageNoteRow}>
                <input
                  type="text"
                  aria-label={`Stage note ${idx + 1}`}
                  className={styles.input}
                  placeholder="Stage note (optional)"
                  value={li.stageNote}
                  onChange={(e) => updateLineItem(li._key, 'stageNote', e.target.value)}
                />
              </div>
              {(fieldErrors[amtKey] || fieldErrors[ingKey]) && (
                <span className={styles.errorMsg}>{fieldErrors[ingKey] ?? fieldErrors[amtKey]}</span>
              )}
            </div>
          );
        })}
        <button type="button" className={styles.btnAdd} onClick={addLineItem}>+ Add ingredient</button>
      </div>

      {/* Nutrition panel — computed inline on every render, no useEffect */}
      <NutritionPanel totals={calculateNutrition(
        lineItems.flatMap((li) => {
          const ing = availableIngredients.find((i) => i.id === li.ingredientId);
          const amount = parseFloat(li.amount);
          if (!ing || isNaN(amount) || amount <= 0) return [];
          return [{ amount, ingredient: ing }];
        })
      )} />

      {/* Steps section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Steps</h3>
        </div>
        {steps.length === 0 && <p className={styles.empty}>No steps added yet.</p>}
        {steps.map((s, idx) => (
          <div key={s._key} className={styles.stepRow}>
            <span className={styles.stepNum}>{idx + 1}</span>
            <input
              type="text"
              aria-label={`Step ${idx + 1}`}
              className={`${styles.input} ${fieldErrors[`steps[${idx}].text`] ? styles.inputError : ''}`}
              value={s.text}
              onChange={(e) => updateStep(s._key, e.target.value)}
            />
            <button
              type="button"
              className={styles.btnRemove}
              onClick={() => removeStep(s._key)}
              aria-label="Remove step"
            >×</button>
          </div>
        ))}
        <button type="button" className={styles.btnAdd} onClick={addStep}>+ Add step</button>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.btnSecondary} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.btnPrimary} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save Recipe'}
        </button>
      </div>
    </form>
  );
}
