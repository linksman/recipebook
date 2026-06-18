import { useState } from 'react';
import { ApiError, createIngredient, updateIngredient } from '../api/ingredients';
import type { Ingredient, IngredientInput } from '../api/ingredients';
import styles from './IngredientForm.module.css';

export const VALID_UNITS = ['Grams', 'Milliliters', 'Units', 'Package'] as const;

interface Props {
  initial?: Ingredient;
  onSuccess: (ingredient: Ingredient) => void;
  onCancel: () => void;
}

interface FormValues {
  name: string;
  strictUnit: string;
  caloriesPerUnit: string;
  carbsPerUnit: string;
  fatPerUnit: string;
  proteinPerUnit: string;
}

function toFormValues(ing?: Ingredient): FormValues {
  if (!ing) {
    return { name: '', strictUnit: '', caloriesPerUnit: '', carbsPerUnit: '', fatPerUnit: '', proteinPerUnit: '' };
  }
  return {
    name: ing.name,
    strictUnit: ing.strictUnit,
    caloriesPerUnit: String(ing.caloriesPerUnit),
    carbsPerUnit: String(ing.carbsPerUnit),
    fatPerUnit: String(ing.fatPerUnit),
    proteinPerUnit: String(ing.proteinPerUnit),
  };
}

function validateValues(v: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!v.name.trim()) errors.name = 'Name is required';
  if (!VALID_UNITS.includes(v.strictUnit as (typeof VALID_UNITS)[number])) {
    errors.strictUnit = 'Unit is required';
  }
  for (const field of ['caloriesPerUnit', 'carbsPerUnit', 'fatPerUnit', 'proteinPerUnit'] as const) {
    const raw = v[field].trim();
    if (!raw) { errors[field] = 'Required'; continue; }
    const num = parseFloat(raw);
    if (isNaN(num)) { errors[field] = 'Must be a number'; continue; }
    if (num < 0) errors[field] = 'Must be 0 or greater';
  }
  return errors;
}

export default function IngredientForm({ initial, onSuccess, onCancel }: Props) {
  const [values, setValues] = useState<FormValues>(toFormValues(initial));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function set(field: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateValues(values);
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    const payload: IngredientInput = {
      name: values.name.trim(),
      strictUnit: values.strictUnit,
      caloriesPerUnit: parseFloat(values.caloriesPerUnit),
      carbsPerUnit: parseFloat(values.carbsPerUnit),
      fatPerUnit: parseFloat(values.fatPerUnit),
      proteinPerUnit: parseFloat(values.proteinPerUnit),
    };

    setBanner('');
    setSubmitting(true);
    try {
      const result = initial
        ? await updateIngredient(initial.id, payload)
        : await createIngredient(payload);
      onSuccess(result);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) setFieldErrors(err.errors);
        else setBanner(err.message);
      } else {
        setBanner('An unexpected error occurred');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const f = (field: keyof FormValues) => ({
    value: values[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => set(field, e.target.value),
    className: `${styles.input} ${fieldErrors[field] ? styles.inputError : ''}`,
  });

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {banner && <p className={styles.banner} role="alert">{banner}</p>}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="ing-name">Name</label>
        <input id="ing-name" name="name" type="text" {...f('name')} />
        {fieldErrors.name && <span className={styles.errorMsg}>{fieldErrors.name}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="ing-unit">Unit type</label>
        <select
          id="ing-unit"
          name="strictUnit"
          value={values.strictUnit}
          onChange={(e) => set('strictUnit', e.target.value)}
          className={`${styles.select} ${fieldErrors.strictUnit ? styles.inputError : ''}`}
        >
          <option value="">Select unit…</option>
          {VALID_UNITS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        {fieldErrors.strictUnit && <span className={styles.errorMsg}>{fieldErrors.strictUnit}</span>}
      </div>

      <div className={styles.grid}>
        {(['caloriesPerUnit', 'carbsPerUnit', 'fatPerUnit', 'proteinPerUnit'] as const).map((field) => (
          <div key={field} className={styles.field}>
            <label className={styles.label} htmlFor={`ing-${field}`}>
              {field === 'caloriesPerUnit' ? 'Calories' :
               field === 'carbsPerUnit' ? 'Carbs' :
               field === 'fatPerUnit' ? 'Fat' : 'Protein'} / unit
            </label>
            <input
              id={`ing-${field}`}
              name={field}
              type="number"
              step="any"
              min="0"
              {...f(field)}
            />
            {fieldErrors[field] && <span className={styles.errorMsg}>{fieldErrors[field]}</span>}
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.btnSecondary} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.btnPrimary} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
