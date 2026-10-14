export interface Restaurant {
  id: number;
  name: string;
}

export interface Dish {
  id: number;
  categoryId: number | null;
  name: string;
  description: string;
  price: number;
  isVeg: boolean;
  spiceLevel: number;
  prepMinutes: number;
  imageUrl: string | null;
  isAvailable: boolean;
}

export interface MenuCategory {
  id: number;
  name: string;
  items: Dish[];
}

export interface Menu {
  restaurant: Restaurant;
  categories: MenuCategory[];
}

export type OrderStatus = 'received' | 'preparing' | 'ready' | 'served';

export interface PlacedOrderItem {
  id: number;
  menuItemId: number | null;
  name: string;
  quantity: number;
  unitPrice: number;
  notes: string;
}

export interface PlacedOrder {
  id: number;
  orderNumber: string;
  tableNumber: number;
  status: OrderStatus;
  notes: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  items: PlacedOrderItem[];
}

/** dish id -> quantity */
export type Cart = Record<number, number>;

export type Nutrient = 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'sodium';

export type NutrientValues = Record<Nutrient, number>;

export interface DishNutrition extends NutrientValues {
  name: string;
  quantity: number;
  servingSize: string;
  highlights: string[];
}

export interface NutritionSummary {
  items: DishNutrition[];
  totals: NutrientValues;
  dailyPercentages: NutrientValues;
  healthTip: string;
}

export type PersonaId =
  | 'friend'
  | 'lover'
  | 'business_partner'
  | 'stranger'
  | 'celebrity'
  | 'therapist'
  | 'drunk_uncle';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}
