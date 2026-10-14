export type StaffRole = 'admin' | 'chef';

export interface Restaurant {
  id: number;
  name: string;
}

export interface RestaurantSettings extends Restaurant {
  joinCode: string;
}

export interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: StaffRole;
  restaurant: Restaurant;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: StaffRole;
  restaurantName?: string;
  restaurantCode?: string;
}

export type OrderStatus = 'received' | 'preparing' | 'ready' | 'served';

export interface KitchenOrder {
  id: number;
  orderNumber: string;
  tableNumber: number;
  status: OrderStatus;
  notes: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  items: { id: number; name: string; quantity: number; unitPrice: number; notes: string }[];
}

export interface Category {
  id: number;
  name: string;
  sortOrder: number;
  isVisible: boolean;
  itemCount: number;
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
  sortOrder: number;
}

export interface DishInput {
  name: string;
  description: string;
  price: number;
  categoryId: number;
  isVeg: boolean;
  spiceLevel: number;
  prepMinutes: number;
  imageUrl: string | null;
  isAvailable: boolean;
}

export interface DiningTable {
  id: number;
  number: number;
  code: string;
  /** Typed by customers who can't scan, together with the table number. */
  pin: string;
  isActive: boolean;
  scansToday: number;
  totalScans: number;
  lastScannedAt: string | null;
}
