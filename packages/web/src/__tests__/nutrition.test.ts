import { describe, it, expect } from 'vitest';
import { calculateNutrition } from '../lib/nutrition';

const flour = { caloriesPerUnit: 3.64, carbsPerUnit: 0.76, fatPerUnit: 0.01, proteinPerUnit: 0.10 };
const milk  = { caloriesPerUnit: 0.61, carbsPerUnit: 0.05, fatPerUnit: 0.03, proteinPerUnit: 0.03 };

describe('calculateNutrition', () => {
  it('returns all zeros for an empty list', () => {
    const totals = calculateNutrition([]);
    expect(totals.calories).toBe(0);
    expect(totals.carbs).toBe(0);
    expect(totals.fat).toBe(0);
    expect(totals.protein).toBe(0);
  });

  it('calculates correct totals for two ingredients', () => {
    const items = [
      { amount: 100, ingredient: flour },
      { amount: 200, ingredient: milk },
    ];
    const totals = calculateNutrition(items);
    expect(totals.calories).toBeCloseTo(100 * 3.64 + 200 * 0.61);
    expect(totals.carbs).toBeCloseTo(100 * 0.76 + 200 * 0.05);
    expect(totals.fat).toBeCloseTo(100 * 0.01 + 200 * 0.03);
    expect(totals.protein).toBeCloseTo(100 * 0.10 + 200 * 0.03);
  });

  it('sums both rows when the same ingredient appears twice', () => {
    const items = [
      { amount: 100, ingredient: flour },
      { amount: 50,  ingredient: flour },
    ];
    const totals = calculateNutrition(items);
    expect(totals.calories).toBeCloseTo(150 * 3.64);
    expect(totals.protein).toBeCloseTo(150 * 0.10);
  });

  it('completes 500 line items in under 10 ms (NFR-1.1)', () => {
    const items = Array.from({ length: 500 }, () => ({ amount: 100, ingredient: flour }));
    const start = performance.now();
    calculateNutrition(items);
    expect(performance.now() - start).toBeLessThan(10);
  });
});
