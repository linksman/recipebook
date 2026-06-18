interface NutritionPerUnit {
  caloriesPerUnit: number;
  carbsPerUnit: number;
  fatPerUnit: number;
  proteinPerUnit: number;
}

export interface NutritionTotals {
  calories: number;
  carbs: number;
  fat: number;
  protein: number;
}

export function calculateNutrition(
  lineItems: Array<{ amount: number; ingredient: NutritionPerUnit }>
): NutritionTotals {
  return lineItems.reduce(
    (acc, { amount, ingredient }) => ({
      calories: acc.calories + amount * ingredient.caloriesPerUnit,
      carbs: acc.carbs + amount * ingredient.carbsPerUnit,
      fat: acc.fat + amount * ingredient.fatPerUnit,
      protein: acc.protein + amount * ingredient.proteinPerUnit,
    }),
    { calories: 0, carbs: 0, fat: 0, protein: 0 }
  );
}
