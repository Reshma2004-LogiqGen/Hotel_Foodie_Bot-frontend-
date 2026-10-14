import { apiUrl } from '../shared/apiBase';
import type { Cart, ChatTurn, Menu, NutritionSummary, PersonaId, PlacedOrder, Restaurant } from './types';

const OFFLINE_MESSAGE = "Can't reach the restaurant right now. Check your internet and try again.";

export class ApiError extends Error {
  /** HTTP status, or 0 when the server could not be reached. */
  status: number;
  /** The error response body, when there was one. */
  data: unknown;

  constructor(message: string, status: number, data: unknown = null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(OFFLINE_MESSAGE, 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.error || 'Something went wrong. Please try again.', response.status, data);
  }
  return data as T;
}

const withCode = (code: string) => `code=${encodeURIComponent(code)}`;

/** Also returns the table's order that hasn't been served yet, so any phone at the table can follow it. */
export const checkTable = (number: number, code: string) =>
  request<{ number: number; restaurant: Restaurant; activeOrder: PlacedOrder | null }>(
    `/tables/${number}?${withCode(code)}`,
  );

/** For customers who can't scan: table number + the PIN printed on the table card. */
export const findTable = (number: number, pin: string) =>
  request<{ number: number; code: string }>('/tables/find', {
    method: 'POST',
    body: JSON.stringify({ number, pin }),
  });

export const getMenu = (code: string) => request<Menu>(`/menu?${withCode(code)}`);

export const placeOrder = (tableNumber: number, code: string, cart: Cart, notes: string) =>
  request<PlacedOrder>('/orders', {
    method: 'POST',
    body: JSON.stringify({
      code,
      tableNumber,
      notes,
      items: Object.entries(cart).map(([id, quantity]) => ({ id: Number(id), quantity })),
    }),
  });

export const getOrder = (orderNumber: string, code: string) =>
  request<PlacedOrder>(`/orders/${encodeURIComponent(orderNumber)}?${withCode(code)}`);

export const getNutrition = (orderNumber: string, code: string) =>
  request<NutritionSummary>(`/orders/${encodeURIComponent(orderNumber)}/nutrition?${withCode(code)}`);

export interface LoverConfig {
  gender: 'male' | 'female' | 'other';
  relationshipStatus: 'single' | 'committed' | 'married' | 'couple';
}

/** An empty message asks the buddy to greet the guest. */
export async function sendChatMessage(data: {
  code: string;
  orderNumber: string;
  persona: PersonaId;
  message: string;
  conversationHistory: ChatTurn[];
  loverConfig?: LoverConfig;
}) {
  const result = await request<{ response: string }>('/chat', { method: 'POST', body: JSON.stringify(data) });
  return result.response;
}
