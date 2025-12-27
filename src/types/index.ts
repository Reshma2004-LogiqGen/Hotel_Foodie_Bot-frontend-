// Food Friend Types

// ============ CHATBOT TYPES ============

export type PersonaType = 
  | 'friend' 
  | 'lover' 
  | 'business_partner' 
  | 'stranger' 
  | 'celebrity' 
  | 'therapist' 
  | 'drunk_uncle' 
  | 'not_interested'
  | 'back_to_menu';

export type Gender = 'male' | 'female' | 'other';

export type RelationshipStatus = 'single' | 'committed' | 'married' | 'couple';

export interface LoverConfig {
  gender: Gender;
  relationshipStatus: RelationshipStatus;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface ChatState {
  isOpen: boolean;
  step: 'persona_selection' | 'lover_gender' | 'lover_status' | 'chatting' | 'closed';
  selectedPersona: PersonaType | null;
  loverConfig: LoverConfig | null;
  messages: Message[];
  notInterestedClicks: number;
}

export interface ChatRequest {
  message: string;
  persona: PersonaType;
  loverConfig?: LoverConfig;
  orderContext?: Order;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ChatResponse {
  response: string;  // FIXED: Changed from 'reply' to 'response'
  error?: string;
}

// ============ ORDER TYPES ============

export interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  emoji?: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered';
  createdAt?: Date;
}

// ============ MENU TYPES ============

export interface MenuItem {
  id: number;
  name: string;
  price: number;
  emoji: string;
  category?: string;
  description?: string;
}

// ============ NUTRITION TYPES ============

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
}

export interface NutritionItem extends MenuItem {
  nutrition: NutritionInfo;
}

// ============ CART TYPES ============

export interface CartItem extends MenuItem {
  quantity: number;
}