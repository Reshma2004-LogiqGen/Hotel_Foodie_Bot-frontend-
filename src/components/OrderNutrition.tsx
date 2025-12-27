import { useState, useEffect } from 'react';
import { nutritionApi } from '../services/api';
import '../styles/OrderNutrition.css';

interface NutritionItem {
  name: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  vitamins?: string[];
}

interface NutritionData {
  items: NutritionItem[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
  };
  dailyPercentages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
  };
  healthTip: string;
}

interface OrderNutritionProps {
  items: Array<{ id: number; name: string; quantity: number; price: number; emoji?: string }>;
  onLoaded?: () => void;
}

export default function OrderNutrition({ items, onLoaded }: OrderNutritionProps) {
  const [nutrition, setNutrition] = useState<NutritionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNutrition();
  }, [items]);

  const fetchNutrition = async () => {
    setLoading(true);
    setError(null);

    try {
      // Prepare items for API
      const apiItems = items.map(item => ({
        name: item.name,
        quantity: item.quantity,
      }));

      console.log('🍎 Fetching nutrition for:', apiItems);

      // Try API call
      const result = await nutritionApi.generateNutrition(apiItems);

      if (result && result.totals) {
        console.log('✅ Nutrition received:', result);
        setNutrition(result);
      } else {
        // Use fallback calculation
        console.log('⚠️ Using fallback nutrition');
        setNutrition(calculateFallbackNutrition(items));
      }
    } catch (err) {
      console.error('❌ Nutrition fetch error:', err);
      // Use fallback on error
      setNutrition(calculateFallbackNutrition(items));
    } finally {
      setLoading(false);
      if (onLoaded) {
        onLoaded();
      }
    }
  };

  // Fallback nutrition calculation (frontend-side)
  const calculateFallbackNutrition = (orderItems: typeof items): NutritionData => {
    const nutritionDB: Record<string, Omit<NutritionItem, 'name' | 'quantity'>> = {
      'Margherita Pizza': { calories: 850, protein: 35, carbs: 95, fat: 38, fiber: 4, sugar: 8, vitamins: ['Vitamin A', 'Calcium'] },
      'Chicken Burger': { calories: 650, protein: 38, carbs: 45, fat: 32, fiber: 3, sugar: 6, vitamins: ['Vitamin B12', 'Iron'] },
      'Caesar Salad': { calories: 350, protein: 12, carbs: 18, fat: 28, fiber: 4, sugar: 3, vitamins: ['Vitamin K', 'Folate'] },
      'Pasta Carbonara': { calories: 750, protein: 28, carbs: 85, fat: 35, fiber: 3, sugar: 4, vitamins: ['Vitamin B12', 'Calcium'] },
      'Fish & Chips': { calories: 950, protein: 42, carbs: 88, fat: 48, fiber: 5, sugar: 2, vitamins: ['Omega-3', 'Vitamin D'] },
      'Veggie Wrap': { calories: 420, protein: 14, carbs: 52, fat: 18, fiber: 8, sugar: 6, vitamins: ['Vitamin A', 'Fiber'] },
      'Sushi Platter': { calories: 580, protein: 28, carbs: 75, fat: 12, fiber: 3, sugar: 8, vitamins: ['Omega-3', 'Iodine'] },
      'Tacos': { calories: 520, protein: 24, carbs: 48, fat: 26, fiber: 6, sugar: 4, vitamins: ['Vitamin C', 'Iron'] },
      'Grilled Salmon': { calories: 480, protein: 52, carbs: 8, fat: 28, fiber: 2, sugar: 2, vitamins: ['Omega-3', 'Vitamin D'] },
      'Butter Chicken': { calories: 650, protein: 38, carbs: 35, fat: 42, fiber: 4, sugar: 8, vitamins: ['Vitamin A', 'Iron'] },
      'Mushroom Risotto': { calories: 580, protein: 14, carbs: 78, fat: 24, fiber: 3, sugar: 3, vitamins: ['Vitamin D', 'Selenium'] },
      'BBQ Ribs': { calories: 1100, protein: 58, carbs: 42, fat: 75, fiber: 2, sugar: 28, vitamins: ['Vitamin B12', 'Zinc'] },
      'Greek Salad': { calories: 280, protein: 8, carbs: 14, fat: 22, fiber: 4, sugar: 6, vitamins: ['Vitamin K', 'Calcium'] },
      'Chicken Wings': { calories: 680, protein: 48, carbs: 8, fat: 52, fiber: 1, sugar: 2, vitamins: ['Vitamin B6', 'Protein'] },
      'Paneer Tikka': { calories: 450, protein: 24, carbs: 18, fat: 32, fiber: 3, sugar: 5, vitamins: ['Calcium', 'Vitamin B12'] },
      'Fruit Smoothie': { calories: 220, protein: 4, carbs: 48, fat: 2, fiber: 4, sugar: 38, vitamins: ['Vitamin C', 'Potassium'] },
    };

    const defaultNutrition = { calories: 500, protein: 20, carbs: 50, fat: 20, fiber: 3, sugar: 10, vitamins: ['Various'] };
    
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 };
    const nutritionItems: NutritionItem[] = [];

    orderItems.forEach(item => {
      const base = nutritionDB[item.name] || defaultNutrition;
      const itemNutrition: NutritionItem = {
        name: item.name,
        quantity: item.quantity,
        calories: base.calories * item.quantity,
        protein: base.protein * item.quantity,
        carbs: base.carbs * item.quantity,
        fat: base.fat * item.quantity,
        fiber: base.fiber * item.quantity,
        sugar: base.sugar * item.quantity,
        vitamins: base.vitamins,
      };
      nutritionItems.push(itemNutrition);

      totals.calories += itemNutrition.calories;
      totals.protein += itemNutrition.protein;
      totals.carbs += itemNutrition.carbs;
      totals.fat += itemNutrition.fat;
      totals.fiber += itemNutrition.fiber;
      totals.sugar += itemNutrition.sugar;
    });

    const dailyValues = { calories: 2000, protein: 50, carbs: 300, fat: 65, fiber: 25, sugar: 50 };
    const dailyPercentages = {
      calories: Math.round((totals.calories / dailyValues.calories) * 100),
      protein: Math.round((totals.protein / dailyValues.protein) * 100),
      carbs: Math.round((totals.carbs / dailyValues.carbs) * 100),
      fat: Math.round((totals.fat / dailyValues.fat) * 100),
      fiber: Math.round((totals.fiber / dailyValues.fiber) * 100),
      sugar: Math.round((totals.sugar / dailyValues.sugar) * 100),
    };

    return {
      items: nutritionItems,
      totals,
      dailyPercentages,
      healthTip: dailyPercentages.protein > 50 
        ? "Great protein choice! 💪 Perfect for muscle recovery."
        : "Enjoy your balanced meal! 😊",
    };
  };

  if (loading) {
    return (
      <div className="nutrition-loading">
        <div className="loading-spinner"></div>
        <p>Calculating nutrition...</p>
      </div>
    );
  }

  if (error || !nutrition) {
    return (
      <div className="nutrition-error">
        <span>⚠️</span>
        <p>{error || 'Unable to load nutrition data'}</p>
      </div>
    );
  }

  return (
    <div className="nutrition-container">
      <h3 className="nutrition-title">🥗 Nutrition Information</h3>

      {/* Daily Value Progress Bars */}
      <div className="daily-values">
        <h4>Daily Value %</h4>
        <div className="progress-grid">
          {Object.entries(nutrition.dailyPercentages).map(([key, value]) => (
            <div key={key} className="progress-item">
              <div className="progress-header">
                <span className="progress-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                <span className="progress-value">{value}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className={`progress-fill ${value > 100 ? 'over' : ''}`}
                  style={{ width: `${Math.min(value, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals Summary */}
      <div className="nutrition-totals">
        <div className="total-item">
          <span className="total-value">{nutrition.totals.calories}</span>
          <span className="total-label">Calories</span>
        </div>
        <div className="total-item">
          <span className="total-value">{nutrition.totals.protein}g</span>
          <span className="total-label">Protein</span>
        </div>
        <div className="total-item">
          <span className="total-value">{nutrition.totals.carbs}g</span>
          <span className="total-label">Carbs</span>
        </div>
        <div className="total-item">
          <span className="total-value">{nutrition.totals.fat}g</span>
          <span className="total-label">Fat</span>
        </div>
      </div>

      {/* Health Tip */}
      {nutrition.healthTip && (
        <div className="health-tip">
          <span className="tip-icon">💡</span>
          <p>{nutrition.healthTip}</p>
        </div>
      )}
    </div>
  );
}
