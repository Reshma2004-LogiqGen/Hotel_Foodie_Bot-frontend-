import { apiUrl } from '../shared/apiBase';
import type {
  Category,
  DiningTable,
  Dish,
  DishInput,
  KitchenOrder,
  OrderStatus,
  RegisterInput,
  RestaurantSettings,
  StaffRole,
  StaffUser,
} from './types';

const TOKEN_KEY = 'ff_admin_token';
export const UNAUTHORIZED_EVENT = 'ff-admin-unauthorized';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  formData?: FormData;
};

async function request<T>(path: string, { method = 'GET', body, formData }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method,
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError("Can't reach the server. Check that the backend is running.", 0);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token) {
      tokenStore.clear();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(data?.error ?? 'Something went wrong. Please try again.', response.status);
  }
  return data as T;
}

export const adminApi = {
  register: (input: RegisterInput) =>
    request<{ token: string; user: StaffUser }>('/auth/register', { method: 'POST', body: input }),
  login: (email: string, password: string) =>
    request<{ token: string; user: StaffUser }>('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request<{ user: StaffUser }>('/auth/me'),

  getRestaurant: () => request<RestaurantSettings>('/admin/restaurant'),
  renameRestaurant: (name: string) =>
    request<RestaurantSettings>('/admin/restaurant', { method: 'PATCH', body: { name } }),
  regenerateJoinCode: () => request<RestaurantSettings>('/admin/restaurant/join-code', { method: 'POST' }),

  listStaff: () => request<StaffUser[]>('/admin/staff'),
  changeStaffRole: (id: number, role: StaffRole) =>
    request<StaffUser>(`/admin/staff/${id}`, { method: 'PATCH', body: { role } }),
  removeStaff: (id: number) => request<{ success: true }>(`/admin/staff/${id}`, { method: 'DELETE' }),

  listKitchenOrders: () => request<KitchenOrder[]>('/kitchen/orders'),
  updateOrderStatus: (id: number, status: OrderStatus) =>
    request<KitchenOrder>(`/kitchen/orders/${id}`, { method: 'PATCH', body: { status } }),

  listCategories: () => request<Category[]>('/admin/categories'),
  createCategory: (name: string) => request<Category>('/admin/categories', { method: 'POST', body: { name } }),
  updateCategory: (id: number, changes: Partial<Pick<Category, 'name' | 'isVisible'>>) =>
    request<Category>(`/admin/categories/${id}`, { method: 'PATCH', body: changes }),
  reorderCategories: (ids: number[]) => request<Category[]>('/admin/categories/order', { method: 'PUT', body: { ids } }),
  deleteCategory: (id: number, withDishes = false) =>
    request<{ success: true }>(`/admin/categories/${id}${withDishes ? '?withDishes=true' : ''}`, { method: 'DELETE' }),

  listDishes: () => request<Dish[]>('/admin/items'),
  createDish: (input: DishInput) => request<Dish>('/admin/items', { method: 'POST', body: input }),
  updateDish: (id: number, changes: Partial<DishInput>) =>
    request<Dish>(`/admin/items/${id}`, { method: 'PATCH', body: changes }),
  deleteDish: (id: number) => request<{ success: true }>(`/admin/items/${id}`, { method: 'DELETE' }),
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ url: string }>('/admin/uploads', { method: 'POST', formData });
  },

  listTables: () => request<DiningTable[]>('/admin/tables'),
  createTables: (start: number, end: number) =>
    request<{ created: number[]; skipped: number[] }>('/admin/tables', { method: 'POST', body: { start, end } }),
  updateTable: (id: number, changes: { isActive: boolean }) =>
    request<DiningTable>(`/admin/tables/${id}`, { method: 'PATCH', body: changes }),
  regenerateTableCode: (id: number) =>
    request<DiningTable>(`/admin/tables/${id}/regenerate-code`, { method: 'POST' }),
  deleteTable: (id: number) => request<{ success: true }>(`/admin/tables/${id}`, { method: 'DELETE' }),
};

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
