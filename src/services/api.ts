/**
 * Food Friend - API Service
 * Handles all backend API calls
 * Auto-detects localhost vs network IP for mobile access
 */

// Dynamic API URL - works on both localhost and network IP
const getApiBaseUrl = (): string => {
  const hostname = window.location.hostname;
  
  // If accessing via localhost, use localhost for API
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  
  // If accessing via network IP, use same IP for API (HTTP for backend)
  return `http://${hostname}:5000/api`;
};

const API_BASE_URL = getApiBaseUrl();
console.log('🔗 API Base URL:', API_BASE_URL);

// Chat API
export const chatApi = {
  sendMessage: async (data: {
    message: string;
    persona: string;
    loverConfig?: { gender: string; relationshipStatus: string };
    orderContext?: any;
    conversationHistory?: Array<{ role: string; content: string }>;
  }) => {
    try {
      console.log('📤 Sending chat request');
      
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📥 Chat response:', result);
      return result;
    } catch (error) {
      console.error('❌ Chat API error:', error);
      // Return short fallback response
      return {
        response: "Hey! What's up? 😊"
      };
    }
  },
};

// Nutrition API
export const nutritionApi = {
  generateNutrition: async (items: Array<{ name: string; quantity: number }>) => {
    try {
      console.log('📤 Sending nutrition request');
      
      const response = await fetch(`${API_BASE_URL}/nutrition/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📥 Nutrition response received');
      return result;
    } catch (error) {
      console.error('❌ Nutrition API error:', error);
      return null;
    }
  },

  getItemNutrition: async (itemId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/nutrition/${itemId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ Get nutrition error:', error);
      return null;
    }
  },
};

// Order API
export const orderApi = {
  placeOrder: async (data: {
    items: Array<{ id: number; name: string; quantity: number; price: number; emoji?: string }>;
    tableNumber: number;
    total: number;
    orderId: string;
  }) => {
    try {
      console.log('📤 Placing order:', data);
      
      const response = await fetch(`${API_BASE_URL}/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📥 Order response:', result);
      return result;
    } catch (error) {
      console.error('❌ Order API error:', error);
      return { success: false, error: 'Failed to place order' };
    }
  },

  getOrders: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ Get orders error:', error);
      return [];
    }
  },

  updateOrderStatus: async (orderId: string, status: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/order/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ Update order error:', error);
      return { success: false };
    }
  },
};

export default { chatApi, nutritionApi, orderApi };